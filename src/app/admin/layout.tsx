import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/shared/app-header";
import { DesenvolvidoPor } from "@/components/brand/logo";
import { TourGuiado } from "@/components/tour/tour-guiado";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/painel");

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <AppHeader nome={user.nome} isAdmin area="admin" />
      <main className="container flex-1 py-8">{children}</main>
      <TourGuiado userId={user.id} />
      <footer className="border-t bg-card py-4">
        <div className="container flex justify-center">
          <DesenvolvidoPor />
        </div>
      </footer>
    </div>
  );
}
