import { AuthError, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Logo do escritório do próprio usuário (pré-visualização em Minha conta). */
export async function GET() {
  try {
    const user = await requireUser();
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { logo: true, logoMime: true } });
    if (!u?.logo || !u.logoMime) return new Response("Sem logo", { status: 404 });
    return new Response(new Uint8Array(u.logo), {
      headers: { "Content-Type": u.logoMime, "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    if (e instanceof AuthError) return new Response("Não autorizado", { status: 401 });
    throw e;
  }
}
