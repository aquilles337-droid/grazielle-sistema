import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/shared/app-header";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-secondary/30">
      <AppHeader nome={user.nome} isAdmin={user.role === "ADMIN"} area="painel" />
      <main className="container py-8">{children}</main>
    </div>
  );
}
