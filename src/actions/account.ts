"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { changePasswordSchema, escritorioSchema, type ActionResult } from "@/lib/validators";
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

// ---------------- Dados do escritório (white-label do PDF) ----------------

const LOGO_MAX_BYTES = 1024 * 1024; // 1 MB

/** Identifica PNG/JPG pelos bytes iniciais — o PDF só aceita esses formatos. */
function tipoImagem(buf: Buffer): "image/png" | "image/jpeg" | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

export async function salvarDadosEscritorio(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = escritorioSchema.safeParse(formToObject(formData));
    if (!parsed.success) return zodFail(parsed.error);
    await prisma.user.update({
      where: { id: user.id },
      data: { escritorio: parsed.data.escritorio ?? null, crc: parsed.data.crc ?? null },
    });
    revalidatePath("/painel/conta");
    return { ok: true, message: "Dados do escritório salvos." };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function enviarLogo(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const arquivo = formData.get("logo");
    if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, error: "Selecione uma imagem." };
    if (arquivo.size > LOGO_MAX_BYTES) return { ok: false, error: "A imagem deve ter no máximo 1 MB." };

    const buf = Buffer.from(await arquivo.arrayBuffer());
    const mime = tipoImagem(buf);
    if (!mime) return { ok: false, error: "Formato não suportado. Envie a logo em PNG ou JPG." };

    await prisma.user.update({
      where: { id: user.id },
      data: { logo: buf, logoMime: mime, logoAtualizadaEm: new Date() },
    });
    revalidatePath("/painel/conta");
    return { ok: true, message: "Logo salva. Ela já aparece nos próximos PDFs." };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function removerLogo(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { logo: null, logoMime: null, logoAtualizadaEm: null } });
    revalidatePath("/painel/conta");
    return { ok: true, message: "Logo removida." };
  } catch (e) {
    return handleActionError(e);
  }
}
