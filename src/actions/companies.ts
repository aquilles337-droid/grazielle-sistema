"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActiveUser as requireUser } from "@/lib/auth";
import { companySchema, type ActionResult } from "@/lib/validators";
import { formToObject, handleActionError, zodFail } from "./_helpers";

/*
 * Multitenancy: TODA consulta inclui `userId` da sessão no WHERE.
 * Nunca usamos `findUnique({ where: { id } })` isolado para dados de tenant —
 * um ID adivinhado de outro contador simplesmente não retorna nada.
 */

export async function listCompanies() {
  const user = await requireUser();
  return prisma.company.findMany({
    where: { userId: user.id },
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { simulations: true } },
      simulations: { orderBy: { data: "desc" }, take: 1, select: { veredito: true, data: true } },
    },
  });
}

export async function getCompany(id: string) {
  const user = await requireUser();
  return prisma.company.findFirst({ where: { id, userId: user.id } });
}

export async function createCompany(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = companySchema.safeParse(formToObject(formData));
    if (!parsed.success) return zodFail(parsed.error);

    const exists = await prisma.company.findFirst({
      where: { userId: user.id, cnpj: parsed.data.cnpj },
      select: { id: true },
    });
    if (exists) return { ok: false, error: "Você já cadastrou uma empresa com este CNPJ." };

    const company = await prisma.company.create({ data: { ...parsed.data, userId: user.id } });
    revalidatePath("/painel");
    return { ok: true, data: { id: company.id }, message: "Empresa cadastrada." };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function updateCompany(id: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = companySchema.safeParse(formToObject(formData));
    if (!parsed.success) return zodFail(parsed.error);

    const { count } = await prisma.company.updateMany({ where: { id, userId: user.id }, data: parsed.data });
    if (count === 0) return { ok: false, error: "Empresa não encontrada." };

    revalidatePath("/painel");
    revalidatePath(`/painel/empresas/${id}`);
    return { ok: true, message: "Empresa atualizada." };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function deleteCompany(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    // deleteMany com userId: se o ID não pertencer ao tenant, nada é apagado
    const { count } = await prisma.company.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return { ok: false, error: "Empresa não encontrada." };
    revalidatePath("/painel");
    return { ok: true, message: "Empresa excluída." };
  } catch (e) {
    return handleActionError(e);
  }
}
