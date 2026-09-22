"use server";

import { prisma } from "@/lib/prisma";
import { leadSchema, type ActionResult } from "@/lib/validators";
import { formToObject, handleActionError, zodFail } from "./_helpers";

/** Ação pública da landing page — capta o lead na tabela `leads`. */
export async function createLead(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  // Honeypot anti-bot: campo invisível que humanos não preenchem
  if (formData.get("website")) return { ok: true, message: "Recebemos seus dados!" };

  const parsed = leadSchema.safeParse(formToObject(formData));
  if (!parsed.success) return zodFail(parsed.error);

  try {
    // Evita duplicar o mesmo lead em reenvios dentro de 24h
    const recente = await prisma.lead.findFirst({
      where: { email: parsed.data.email, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      select: { id: true },
    });
    if (!recente) {
      await prisma.lead.create({ data: { ...parsed.data, origem: "landing" } });
    }
    return { ok: true, message: "Recebemos seus dados! Nossa equipe entrará em contato em até 1 dia útil." };
  } catch (e) {
    return handleActionError(e);
  }
}
