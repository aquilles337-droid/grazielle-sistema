import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "./sign-out-button";

export function AppHeader({
  nome,
  isAdmin,
  area,
}: {
  nome: string;
  isAdmin: boolean;
  area: "painel" | "admin";
}) {
  return (
    <header className="border-b border-b-accent/20 bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/painel" className="flex items-center gap-2 font-bold">
            <Logo />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/painel" className={area === "painel" ? "font-semibold" : "text-muted-foreground hover:text-foreground"}>
              Empresas
            </Link>
            <Link href="/painel/assinatura" className="text-muted-foreground hover:text-foreground">
              Assinatura
            </Link>
            <Link href="/painel/conta" className="hidden text-muted-foreground hover:text-foreground sm:inline">
              Minha conta
            </Link>
            {isAdmin && (
              <Link href="/admin" className={area === "admin" ? "font-semibold" : "text-muted-foreground hover:text-foreground"}>
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">{nome}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
