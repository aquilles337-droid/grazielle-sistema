"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { cartaoSchema, pixSchema, signupSchema, type ActionResult } from "@/lib/validators";
import { PLANOS, TRIAL_DIAS, precoPlano } from "@/lib/billing/planos";
import * as MP from "@/lib/billing/mercadopago";
import { processarPagamentoMP, sincronizarPreapproval } from "@/lib/billing/processar";
import { formToObject, handleActionError, zodFail } from "./_helpers";

const PIX_VALIDADE_MIN = 60;

/** Teste grátis só para conta que nunca usou teste nem pagou. */
async function trialDisponivel(userId: string) {
  const [user, pagou] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { trialUsadoEm: true } }),
    prisma.pagamento.count({ where: { userId, status: { in: ["APROVADO", "ESTORNADO"] } } }),
  ]);
  return !user?.trialUsadoEm && pagou === 0;
}

/** O CPF/CNPJ do titular do cartão já fez teste grátis em outra conta? */
async function documentoJaUsouTrial(userId: string, doc?: string) {
  if (!doc) return false;
  const n = await prisma.assinatura.count({
    where: { docPagador: doc, trialDias: { gt: 0 }, mpPreapprovalId: { not: null }, userId: { not: userId } },
  });
  return n > 0;
}

/** Usado na tela para exibir (ou não) a oferta de teste grátis. */
export async function podeUsarTrial(): Promise<boolean> {
  const user = await requireUser();
  return trialDisponivel(user.id);
}

/** Cadastro público do assinante (sem acesso até o primeiro pagamento aprovado). */
export async function criarContaAssinante(
  _prev: ActionResult<{ email: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ email: string }>> {
  if (formData.get("website")) return { ok: false, error: "Não foi possível concluir o cadastro." };

  const parsed = signupSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodFail(parsed.error);
  const { confirmacao: _c, senha, ...dados } = parsed.data;

  try {
    const existe = await prisma.user.findUnique({ where: { email: dados.email }, select: { id: true } });
    if (existe) {
      return { ok: false, error: "Já existe uma conta com este e-mail. Entre com sua senha para assinar ou renovar." };
    }
    await prisma.user.create({
      data: { ...dados, senha: await bcrypt.hash(senha, 12), role: "ACCOUNTANT", acessoAte: null },
    });
    return { ok: true, data: { email: dados.email } };
  } catch (e) {
    return handleActionError(e);
  }
}

const descricaoPlano = (plano: keyof typeof PLANOS) => `Régua do Híbrido — Plano ${PLANOS[plano].nome}`;
const NAO_CONFIGURADO = "Pagamentos ainda não foram configurados. Fale com o suporte.";

/** Gera (ou reaproveita) um Pix do plano escolhido. */
export async function iniciarPix(payload: unknown): Promise<ActionResult<{ pagamentoId: string }>> {
  try {
    const user = await requireUser();
    const parsed = pixSchema.safeParse(payload);
    if (!parsed.success) return zodFail(parsed.error);
    const { plano } = parsed.data;
    if (!MP.mpConfigurado()) return { ok: false, error: NAO_CONFIGURADO };

    const valor = precoPlano(plano, "PIX");
    const descricao = descricaoPlano(plano);

    // Reaproveita um QR Code ainda válido do mesmo plano (evita gerar cobranças repetidas)
    const aberto = await prisma.pagamento.findFirst({
      where: { userId: user.id, metodo: "PIX", plano, status: "PENDENTE", pixExpiraEm: { gt: new Date(Date.now() + 5 * 60_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (aberto?.pixQrCode) return { ok: true, data: { pagamentoId: aberto.id } };

    const expiraEm = new Date(Date.now() + PIX_VALIDADE_MIN * 60_000);
    const pag = await prisma.pagamento.create({
      data: { userId: user.id, plano, metodo: "PIX", valor, pixExpiraEm: expiraEm },
    });
    try {
      const mp = await MP.criarPagamentoPix({
        pagamentoId: pag.id,
        valor,
        descricao,
        email: user.email,
        nome: user.nome,
        expiraEm,
      });
      const td = mp.point_of_interaction?.transaction_data;
      if (!td?.qr_code) throw new Error("Resposta do Mercado Pago sem QR Code");
      await prisma.pagamento.update({
        where: { id: pag.id },
        data: { mpPaymentId: String(mp.id), pixQrCode: td.qr_code, pixQrBase64: td.qr_code_base64 ?? null },
      });
    } catch (e) {
      await prisma.pagamento.update({ where: { id: pag.id }, data: { status: "CANCELADO" } });
      console.error("[billing] criar pix", e);
      return {
        ok: false,
        error: "Não foi possível gerar o Pix agora. Verifique se a conta Mercado Pago tem chave Pix cadastrada e tente novamente.",
      };
    }
    revalidatePath("/painel/assinatura");
    return { ok: true, data: { pagamentoId: pag.id } };
  } catch (e) {
    return handleActionError(e);
  }
}

export type ResultadoCartao =
  | { status: "ATIVA" | "PENDENTE"; trial: boolean }
  | { status: "TRIAL_JA_USADO" };

/**
 * Assinatura no cartão com o token gerado pelo formulário embutido (Card Payment Brick).
 * O número do cartão nunca passa pelo nosso servidor — só o token de uso único.
 */
export async function assinarComCartao(payload: unknown): Promise<ActionResult<ResultadoCartao>> {
  try {
    const user = await requireUser();
    const parsed = cartaoSchema.safeParse(payload);
    if (!parsed.success) return zodFail(parsed.error);
    const { plano, cardToken, docNumero, aceitarSemTrial } = parsed.data;
    if (!MP.mpConfigurado()) return { ok: false, error: NAO_CONFIGURADO };

    const valor = precoPlano(plano, "CARTAO");
    const descricao = descricaoPlano(plano);

    const ativa = await prisma.assinatura.findFirst({ where: { userId: user.id, status: { in: ["ATIVA", "PAUSADA"] } } });
    if (ativa) {
      return { ok: false, error: "Você já tem uma assinatura no cartão. Cancele-a antes de trocar de plano." };
    }

    // Tentativas anteriores não concluídas: cancela para não haver duas assinaturas
    const pendentes = await prisma.assinatura.findMany({ where: { userId: user.id, status: "PENDENTE" } });
    for (const p of pendentes) {
      if (p.mpPreapprovalId) await MP.cancelarPreapproval(p.mpPreapprovalId).catch(() => null);
      await prisma.assinatura.update({ where: { id: p.id }, data: { status: "CANCELADA" } });
    }

    let trialDias = (await trialDisponivel(user.id)) ? TRIAL_DIAS : 0;
    if (trialDias && (await documentoJaUsouTrial(user.id, docNumero))) {
      // Mesmo titular já testou em outra conta: só segue com cobrança imediata se o cliente aceitar
      if (!aceitarSemTrial) return { ok: true, data: { status: "TRIAL_JA_USADO" } };
      trialDias = 0;
    }

    const assinatura = await prisma.assinatura.create({
      data: { userId: user.id, plano, valor, emailPagador: user.email, docPagador: docNumero ?? null, trialDias },
    });

    let pre: MP.MpPreapproval;
    try {
      pre = await MP.criarAssinaturaCartao({
        assinaturaId: assinatura.id,
        valor,
        meses: PLANOS[plano].mesesCartao,
        descricao: trialDias ? `${descricao} (${trialDias} dias grátis)` : descricao,
        emailPagador: user.email,
        cardTokenId: cardToken,
        trialDias,
      });
    } catch (e) {
      await prisma.assinatura.update({ where: { id: assinatura.id }, data: { status: "CANCELADA" } });
      console.error("[billing] criar assinatura cartão", e);
      return { ok: false, error: MP.mensagemErroCartao(e) };
    }

    await prisma.assinatura.update({ where: { id: assinatura.id }, data: { mpPreapprovalId: pre.id } });
    // Aplica o status (libera o teste grátis ou registra a 1ª cobrança se já processada)
    await sincronizarPreapproval(pre.id).catch((e) => console.error("[billing] sync pós-assinatura", e));

    const atual = await prisma.assinatura.findUniqueOrThrow({ where: { id: assinatura.id } });
    revalidatePath("/painel/assinatura");
    return {
      ok: true,
      data: { status: atual.status === "ATIVA" ? "ATIVA" : "PENDENTE", trial: trialDias > 0 },
    };
  } catch (e) {
    return handleActionError(e);
  }
}

export type PixInfo = {
  id: string;
  status: string;
  plano: string;
  valor: number;
  qrCode: string | null;
  qrBase64: string | null;
  expiraEm: string | null;
  acessoAte: string | null;
};

/** Consulta (e sincroniza com o Mercado Pago) um Pix do próprio usuário — usado no polling da tela. */
export async function consultarPix(pagamentoId: string): Promise<ActionResult<PixInfo>> {
  try {
    const user = await requireUser();
    let pag = await prisma.pagamento.findFirst({ where: { id: pagamentoId, userId: user.id, metodo: "PIX" } });
    if (!pag) return { ok: false, error: "Pagamento não encontrado." };

    if (pag.status === "PENDENTE" && pag.mpPaymentId) {
      await processarPagamentoMP(pag.mpPaymentId).catch((e) => console.error("[billing] consultar pix", e));
      pag = (await prisma.pagamento.findUnique({ where: { id: pag.id } }))!;
    }
    if (pag.status === "PENDENTE" && pag.pixExpiraEm && pag.pixExpiraEm < new Date()) {
      pag = await prisma.pagamento.update({ where: { id: pag.id }, data: { status: "EXPIRADO" } });
    }

    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { acessoAte: true } });
    return {
      ok: true,
      data: {
        id: pag.id,
        status: pag.status,
        plano: pag.plano,
        valor: Number(pag.valor),
        qrCode: pag.pixQrCode,
        qrBase64: pag.pixQrBase64,
        expiraEm: pag.pixExpiraEm?.toISOString() ?? null,
        acessoAte: u?.acessoAte?.toISOString() ?? null,
      },
    };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function cancelarAssinatura(assinaturaId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const a = await prisma.assinatura.findFirst({
      where: { id: assinaturaId, userId: user.id, status: { in: ["ATIVA", "PAUSADA", "PENDENTE"] } },
    });
    if (!a) return { ok: false, error: "Assinatura não encontrada." };

    if (a.mpPreapprovalId) await MP.cancelarPreapproval(a.mpPreapprovalId);
    await prisma.assinatura.update({ where: { id: a.id }, data: { status: "CANCELADA" } });
    revalidatePath("/painel/assinatura");
    return { ok: true, message: "Assinatura cancelada. Seu acesso continua até o fim do período já pago." };
  } catch (e) {
    return handleActionError(e);
  }
}
