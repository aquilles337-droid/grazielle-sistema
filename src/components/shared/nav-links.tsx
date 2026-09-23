"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Menu principal com o item da tela atual destacado. */
export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const itens = [
    { href: "/painel", label: "Empresas", tour: "nav-empresas", ativo: pathname === "/painel" || pathname.startsWith("/painel/empresas") },
    { href: "/painel/assinatura", label: "Assinatura", tour: "nav-assinatura", ativo: pathname.startsWith("/painel/assinatura") },
    { href: "/painel/conta", label: "Minha conta", tour: "nav-conta", ativo: pathname.startsWith("/painel/conta"), desktop: true },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", tour: "nav-admin", ativo: pathname.startsWith("/admin") }] : []),
  ];

  return (
    <nav className="flex gap-4 text-sm">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          data-tour={i.tour}
          className={cn(
            "border-b-2 py-1 transition-colors",
            i.ativo ? "border-accent font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            "desktop" in i && i.desktop && "hidden sm:inline",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
