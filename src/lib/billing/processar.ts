import "server-only";
import { Prisma, type AssinaturaStatus, type PagamentoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularNovoAcesso } from "./planos";
import * as MP from "./mercadopago";

/*
 * Máquina de estados dos pagamentos. Fonte da verdade = API do Mercado Pago:
 * webhook e sincronização só trazem o ID; os dados são sempre reconsultados com
 * o nosso token (um webhook forjado não consegue aprovar nada).
 */

export function mapStatusPagamento(p: Pick<MP.MpPayment, "status" | "status_detail">): PagamentoStatus {
  switch (p.status) {
    case "approved":
      return "APROVADO";
    case "rejected":
      return "RECUSADO";
    case "cancelled":
      return p.status_detail === "expired" ? "EXPIRADO" : "CANCELADO";
    case "refunded":
    case "charged_back":
      return "ESTORNADO";
    default:
      return "PENDENTE"; // pending, in_process, authorized, in_mediation
  }
}

export function mapStatusAssinatura(status: string): AssinaturaStatus {
  switch (status) {
    case "authorized":
      return "ATIVA";
    case "paused":
      return "PAUSADA";
    case "cancelled":
      return "CANCELADA";
    default:
      return "PENDENTE";
  }
}

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Aplica um novo status a um pagamento local. Idempotente.
 * Na transição para APROVADO concede o período de acesso (uma única vez, mesmo com
 * webhooks simultâneos — o UPDATE condicional trava a linha). Em estorno, retira o período.
 */
export async function aplicarStatus(pagamentoId: string, novo: PagamentoStatus, aprovadoEm?: Date) {
  await prisma.$transaction(async (tx) => {
    const pag = await tx.pagamento.findUnique({ where: { id: pagamentoId } });
    if (!pag || pag.status === novo) return;

    if (novo === "APROVADO") {
      const { count } = await tx.pagamento.updateMany({
        where: { id: pag.id, status: { not: "APROVADO" } },
        data: { status: "APROVADO", aprovadoEm: aprovadoEm ?? new Date() },
      });
      if (count === 0) return;

      const user = await tx.user.findUniqueOrThrow({ where: { id: pag.userId }, select: { acessoAte: true } });
      const { de, ate } = calcularNovoAcesso(user.acessoAte, new Date(), pag.plano, pag.metodo);
      await tx.user.update({ where: { id: pag.userId }, data: { acessoAte: ate } });
      await tx.pagamento.update({ where: { id: pag.id }, data: { acessoDe: de, acessoAte: ate } });
      return;
    }

    if (pag.status === "APROVADO") {
      if (novo !== "ESTORNADO") return; // aprovado só "volta" por estorno/chargeback
      const { count } = await tx.pagamento.updateMany({
        where: { id: pag.id, status: "APROVADO" },
        data: { status: "ESTORNADO" },
      });
      if (count === 1 && pag.acessoDe && pag.acessoAte) {
        const user = await tx.user.findUniqueOrThrow({ where: { id: pag.userId }, select: { acessoAte: true } });
        if (user.acessoAte) {
          const periodo = pag.acessoAte.getTime() - pag.acessoDe.getTime();
          await tx.user.update({
            where: { id: pag.userId },
            data: { acessoAte: new Date(user.acessoAte.getTime() - periodo) },
          });
        }
      }
      return;
    }

    await tx.pagamento.update({ where: { id: pag.id }, data: { status: novo } });
  });
}

/** Valor pago confere com o esperado (centavos de tolerância para arredondamento). */
const valorConfere = (pago: number, esperado: Prisma.Decimal | number) => pago + 0.01 >= Number(esperado);

/**
 * Processa um pagamento do Mercado Pago pelo ID: Pix avulso (external_reference = Pagamento.id)
 * ou cobrança de assinatura no cartão (external_reference = Assinatura.id ou subscription_id).
 */
export async function processarPagamentoMP(paymentId: string | number, ctx: { assinaturaId?: string } = {}) {
  const p = await MP.buscarPagamento(paymentId);
  const mpId = String(p.id);
  const status = mapStatusPagamento(p);
  const aprovadoEm = p.date_approved ? new Date(p.date_approved) : undefined;
  const ref = p.external_reference || undefined;

  // 1) Pagamento avulso (Pix) já registrado
  const existente = await prisma.pagamento.findFirst({
    where: { OR: [{ mpPaymentId: mpId }, ...(ref ? [{ id: ref, assinaturaId: null }] : [])] },
  });
  if (existente) {
    if (!existente.mpPaymentId) {
      await prisma.pagamento.update({ where: { id: existente.id }, data: { mpPaymentId: mpId } });
    }
    if (status === "APROVADO" && !valorConfere(p.transaction_amount, existente.valor)) {
      console.error("[billing] valor divergente", { mpId, pago: p.transaction_amount, esperado: existente.valor });
      return existente.id;
    }
    await aplicarStatus(existente.id, status, aprovadoEm);
    return existente.id;
  }

  // 2) Cobrança recorrente de assinatura no cartão
  const subscriptionId = p.point_of_interaction?.transaction_data?.subscription_id;
  const assinatura = await prisma.assinatura.findFirst({
    where: {
      OR: [
        ...(ctx.assinaturaId ? [{ id: ctx.assinaturaId }] : []),
        ...(ref ? [{ id: ref }] : []),
        ...(subscriptionId ? [{ mpPreapprovalId: subscriptionId }] : []),
      ],
    },
  });
  if (!assinatura) return null; // não é nosso (ou chegará via subscription_authorized_payment)

  if (status === "APROVADO" && !valorConfere(p.transaction_amount, assinatura.valor)) {
    console.error("[billing] valor divergente (assinatura)", { mpId, pago: p.transaction_amount });
    return null;
  }

  let pag;
  try {
    pag = await prisma.pagamento.create({
      data: {
        userId: assinatura.userId,
        assinaturaId: assinatura.id,
        plano: assinatura.plano,
        metodo: "CARTAO",
        valor: p.transaction_amount,
        mpPaymentId: mpId,
      },
    });
  } catch (e) {
    // Outro webhook registrou o mesmo pagamento ao mesmo tempo
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      pag = await prisma.pagamento.findUniqueOrThrow({ where: { mpPaymentId: mpId } });
    } else throw e;
  }

  await aplicarStatus(pag.id, status, aprovadoEm);
  if (status === "APROVADO" && assinatura.status === "PENDENTE") {
    await prisma.assinatura.update({ where: { id: assinatura.id }, data: { status: "ATIVA" } });
  }
  return pag.id;
}

/**
 * Teste grátis: quando o Mercado Pago autoriza a assinatura (cartão cadastrado e validado),
 * libera N dias antes da 1ª cobrança. Só uma vez por conta — o UPDATE condicional em
 * trialUsadoEm garante isso mesmo com webhook e sincronização ao mesmo tempo.
 */
export async function concederTrial(assinaturaId: string) {
  await prisma.$transaction(async (tx) => {
    const a = await tx.assinatura.findUnique({ where: { id: assinaturaId } });
    if (!a || a.trialDias <= 0 || a.status !== "ATIVA") return;

    const { count } = await tx.user.updateMany({
      where: { id: a.userId, trialUsadoEm: null },
      data: { trialUsadoEm: new Date() },
    });
    if (count === 0) return;

    const user = await tx.user.findUniqueOrThrow({ where: { id: a.userId }, select: { acessoAte: true } });
    const fimTrial = new Date(Date.now() + a.trialDias * DIA_MS);
    if (!user.acessoAte || user.acessoAte < fimTrial) {
      await tx.user.update({ where: { id: a.userId }, data: { acessoAte: fimTrial } });
    }
  });
}

/** Atualiza o status da assinatura e registra as cobranças já feitas nela. */
export async function sincronizarPreapproval(preapprovalId: string) {
  const pre = await MP.buscarPreapproval(preapprovalId);
  const assinatura = await prisma.assinatura.findFirst({
    where: { OR: [{ mpPreapprovalId: pre.id }, ...(pre.external_reference ? [{ id: pre.external_reference }] : [])] },
  });
  if (!assinatura) return null;

  const status = mapStatusAssinatura(pre.status);
  await prisma.assinatura.update({
    where: { id: assinatura.id },
    data: { status, mpPreapprovalId: pre.id },
  });
  if (status === "ATIVA" && assinatura.trialDias > 0) await concederTrial(assinatura.id);

  if (pre.status !== "pending") {
    try {
      const { results = [] } = await MP.listarAuthorizedPayments(pre.id);
      for (const ap of results) {
        if (ap.payment?.id) await processarPagamentoMP(ap.payment.id, { assinaturaId: assinatura.id });
      }
    } catch (e) {
      console.error("[billing] falha ao listar cobranças da assinatura", pre.id, e);
    }
  }
  return assinatura.id;
}

/** Webhook "subscription_authorized_payment": uma cobrança da assinatura foi processada. */
export async function processarAuthorizedPayment(id: string) {
  const ap = await MP.buscarAuthorizedPayment(id);
  if (!ap.payment?.id || !ap.preapproval_id) return null;
  const assinatura = await prisma.assinatura.findUnique({ where: { mpPreapprovalId: ap.preapproval_id } });
  if (!assinatura) return null;
  return processarPagamentoMP(ap.payment.id, { assinaturaId: assinatura.id });
}

/**
 * Sincroniza pendências do usuário direto com o Mercado Pago. Garante que o acesso
 * seja liberado mesmo se um webhook se perder (chamado ao abrir a página de assinatura).
 */
export async function sincronizarUsuario(userId: string) {
  const agora = new Date();
  const [pixPendentes, assinaturas] = await Promise.all([
    prisma.pagamento.findMany({
      where: { userId, status: "PENDENTE", metodo: "PIX", mpPaymentId: { not: null }, createdAt: { gte: new Date(agora.getTime() - 7 * DIA_MS) } },
      select: { mpPaymentId: true },
    }),
    prisma.assinatura.findMany({
      where: { userId, status: { in: ["PENDENTE", "ATIVA", "PAUSADA"] }, mpPreapprovalId: { not: null } },
      select: { mpPreapprovalId: true },
    }),
  ]);

  for (const p of pixPendentes) {
    await processarPagamentoMP(p.mpPaymentId!).catch((e) => console.error("[billing] sync pix", e));
  }
  for (const a of assinaturas) {
    await sincronizarPreapproval(a.mpPreapprovalId!).catch((e) => console.error("[billing] sync assinatura", e));
  }

  // QR Codes vencidos que continuam pendentes localmente
  await prisma.pagamento.updateMany({
    where: { userId, status: "PENDENTE", metodo: "PIX", pixExpiraEm: { lt: agora } },
    data: { status: "EXPIRADO" },
  });
}
