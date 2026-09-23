import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BotaoTutorial } from "@/components/tour/tour-guiado";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

export function AppHeader({ nome, isAdmin }: { nome: string; isAdmin: boolean; area?: "painel" | "admin" }) {
  return (
    <header className="border-b border-b-accent/20 bg-card shadow-sm">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/painel" className="flex items-center gap-2 font-bold">
            <Logo compact />
          </Link>
          <NavLinks isAdmin={isAdmin} />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground md:inline">{nome}</span>
          <BotaoTutorial className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-accent transition-colors hover:bg-accent/10">
            <CircleHelp className="h-4 w-4" />
            <span className="hidden sm:inline">Tutorial</span>
          </BotaoTutorial>
          <span data-tour="sair">
            <SignOutButton />
          </span>
        </div>
      </div>
    </header>
  );
}
