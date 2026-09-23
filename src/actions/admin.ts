"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { accountantSchema, type ActionResult } from "@/lib/validators";
import { formToObject, handleActionError, zodFail } from "./_helpers";

/*
 * Ações exclusivas do ADMIN. Todas começam com requireAdmin(), independentemente
 * do middleware — Server Actions são endpoints POST e podem ser chamadas diretamente.
 * O admin gerencia contas, mas NÃO acessa empresas/simulações dos contadores.
 */

export async function listAccountants() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      nome: true,
      email: true,
      role: true,
      escritorio: true,
      crc: true,
      ativo: true,
      acessoAte: true,
      createdAt: true,
      _count: { select: { companies: true } },
      assinaturas: { where: { status: "ATIVA" }, select: { plano: true }, take: 1 },
    },
  });
}

export async function listPagamentos() {
  await requireAdmin();
  return prisma.pagamento.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { nome: true, email: true } } },
  });
}

/** Cortesia/ajuste manual: soma dias ao acesso (ou revoga com dias = 0). */
export async function concederAcesso(userId: string, dias: number): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!Number.isInteger(dias) || dias < 0 || dias > 3660) return { ok: false, error: "Quantidade de dias inválida." };
    const u = await prisma.user.findFirst({ where: { id: userId, role: "ACCOUNTANT" }, select: { acessoAte: true } });
    if (!u) return { ok: false, error: "Contador não encontrado." };

    const agora = new Date();
    const base = u.acessoAte && u.acessoAte > agora ? u.acessoAte : agora;
    const acessoAte = dias === 0 ? agora : new Date(base.getTime() + dias * 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { acessoAte } });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function listLeads() {
  await requireAdmin();
  return prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

export async function createAccountant(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = accountantSchema.safeParse(formToObject(formData));
    if (!parsed.success) return zodFail(parsed.error);

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (exists) return { ok: false, error: "Já existe um usuário com este e-mail." };

    const senha = await bcrypt.hash(parsed.data.senha, 12);
    const { diasAcesso, ...dados } = parsed.data;
    await prisma.user.create({
      data: {
        ...dados,
        senha,
        role: "ACCOUNTANT",
        acessoAte: diasAcesso > 0 ? new Date(Date.now() + diasAcesso * 24 * 60 * 60 * 1000) : null,
      },
    });

    revalidatePath("/admin");
    return { ok: true, message: `Acesso criado para ${parsed.data.email}.` };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function setAccountantActive(userId: string, ativo: boolean): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (userId === admin.id) return { ok: false, error: "Você não pode desativar a própria conta." };

    const { count } = await prisma.user.updateMany({ where: { id: userId, role: "ACCOUNTANT" }, data: { ativo } });
    if (count === 0) return { ok: false, error: "Contador não encontrado." };

    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function resetAccountantPassword(userId: string, novaSenha: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (typeof novaSenha !== "string" || novaSenha.length < 8 || novaSenha.length > 100) {
      return { ok: false, error: "A senha deve ter entre 8 e 100 caracteres." };
    }
    const senha = await bcrypt.hash(novaSenha, 12);
    const { count } = await prisma.user.updateMany({ where: { id: userId, role: "ACCOUNTANT" }, data: { senha } });
    if (count === 0) return { ok: false, error: "Contador não encontrado." };
    return { ok: true, message: "Senha redefinida." };
  } catch (e) {
    return handleActionError(e);
  }
}

const LEAD_STATUS: LeadStatus[] = ["NOVO", "CONTATADO", "CONVERTIDO", "DESCARTADO"];

export async function updateLeadStatus(leadId: string, status: LeadStatus): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (!LEAD_STATUS.includes(status)) return { ok: false, error: "Status inválido." };
    await prisma.lead.update({ where: { id: leadId }, data: { status } });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return handleActionError(e);
  }
}
