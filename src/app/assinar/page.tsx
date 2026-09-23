import Link from "next/link";
import { DesenvolvidoPor, Logo } from "@/components/brand/logo";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PLANOS, TRIAL_DIAS, type MetodoTipo, type PlanoTipo } from "@/lib/billing/planos";
import { formatBRL } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function AssinarPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; metodo?: string }>;
}) {
  const sp = await searchParams;
  const plano: PlanoTipo = sp.plano === "ANUAL" ? "ANUAL" : "MENSAL";
  const metodo: MetodoTipo = sp.metodo === "PIX" ? "PIX" : "CARTAO";
  const destino = `/painel/assinatura?plano=${plano}&metodo=${metodo}`;

  // Já tem conta e está logado: vai direto ao pagamento
  const session = await getSession();
  if (session?.user) redirect(destino);

  const p = PLANOS[plano];

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Logo />
          </Link>
          <Link href={`/login?callbackUrl=${encodeURIComponent(destino)}`} className="text-sm font-medium hover:underline">
            Já tenho conta
          </Link>
        </div>
      </header>

      <main className="container grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Crie sua conta</CardTitle>
            <CardDescription>Passo 1 de 2 — em seguida você escolhe cartão ou Pix e paga.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignupForm destino={destino} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardDescription>Plano escolhido</CardDescription>
            <CardTitle>{p.nome}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="grid gap-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cartão (recorrente)</span>
                <span className="font-semibold">
                  {formatBRL(p.precos.CARTAO)}/{plano === "MENSAL" ? "mês" : "ano"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pix ({p.diasPix} dias)</span>
                <span className="font-semibold">{formatBRL(p.precos.PIX)}</span>
              </div>
            </div>
            <p className="rounded-md border border-accent/25 bg-accent/5 p-3 text-accent">
              <strong>{TRIAL_DIAS} dias grátis</strong> assinando no cartão. A 1ª cobrança só acontece depois do teste.
            </p>
            <ul className="grid gap-2 border-t pt-4">
              {[
                "Simulações ilimitadas Simples puro × Híbrido",
                "Relatório PDF com a marca do seu escritório",
                "Cálculos conforme a LC 214/2025",
                "Seus dados isolados e protegidos",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/#planos" className="text-xs text-muted-foreground hover:underline">
              Trocar de plano
            </Link>
          </CardContent>
        </Card>
      </main>
      <footer className="pb-8 text-center">
        <DesenvolvidoPor />
      </footer>
    </div>
  );
}
