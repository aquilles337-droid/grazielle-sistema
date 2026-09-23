import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/shared/app-header";
import { AVISO_RENOVACAO_DIAS, diasRestantes } from "@/lib/billing/planos";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  // Aviso de renovação para quem paga no Pix (no cartão a cobrança é automática)
  let aviso: string | null = null;
  if (user.role !== "ADMIN" && user.acessoAte) {
    const dias = diasRestantes(user.acessoAte, new Date());
    const cartaoAtivo = await prisma.assinatura.count({ where: { userId: user.id, status: "ATIVA" } });
    if (!cartaoAtivo && dias !== null && dias <= AVISO_RENOVACAO_DIAS) {
      aviso =
        dias > 0
          ? `Seu acesso vence em ${dias} dia${dias > 1 ? "s" : ""} (${formatDate(user.acessoAte)}).`
          : "Seu acesso venceu.";
    }
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader nome={user.nome} isAdmin={user.role === "ADMIN"} area="painel" />
      {aviso && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="container flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-amber-900">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {aviso}
            </span>
            <Link href="/painel/assinatura" className="font-semibold underline">
              Renovar agora
            </Link>
          </div>
        </div>
      )}
      <main className="container py-8">{children}</main>
    </div>
  );
}
