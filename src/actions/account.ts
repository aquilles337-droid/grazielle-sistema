"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { changePasswordSchema, type ActionResult } from "@/lib/validators";
import { formToObject, handleActionError, zodFail } from "./_helpers";

export async function changeOwnPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = changePasswordSchema.safeParse(formToObject(formData));
    if (!parsed.success) return zodFail(parsed.error);

    const atual = await prisma.user.findUnique({ where: { id: user.id }, select: { senha: true } });
    if (!atual || !(await bcrypt.compare(parsed.data.senhaAtual, atual.senha))) {
      return { ok: false, error: "Senha atual incorreta." };
    }

    const senha = await bcrypt.hash(parsed.data.novaSenha, 12);
    await prisma.user.update({ where: { id: user.id }, data: { senha } });
    return { ok: true, message: "Senha alterada com sucesso." };
  } catch (e) {
    return handleActionError(e);
  }
}
