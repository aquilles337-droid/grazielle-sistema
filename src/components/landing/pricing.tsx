import Link from "next/link";
import { Check, CreditCard, QrCode } from "lucide-react";
import { PLANOS, TRIAL_DIAS, type PlanoTipo } from "@/lib/billing/planos";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const incluso = [
  "Simulações ilimitadas",
  "Empresas ilimitadas na carteira",
  "PDF com a marca do seu escritório",
  "Atualizações das premissas da LC 214/2025",
];

export function Pricing() {
  const economia = PLANOS.MENSAL.precos.CARTAO * 12 - PLANOS.ANUAL.precos.CARTAO;

  return (
    <section id="planos" className="container scroll-mt-16 py-16 md:py-24">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">Planos simples, sem fidelidade</h2>
        <p className="mt-3 text-muted-foreground">
          Assine no cartão com renovação automática ou pague no Pix com desconto.
        </p>
        <Badge variant="success" className="mt-4 px-3 py-1 text-sm">
          Teste grátis por {TRIAL_DIAS} dias no cartão — cancele antes e não paga nada
        </Badge>
      </div>
      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {(["MENSAL", "ANUAL"] as PlanoTipo[]).map((plano) => {
          const p = PLANOS[plano];
          const destaque = plano === "ANUAL";
          const periodo = plano === "MENSAL" ? "mês" : "ano";
          return (
            <Card key={plano} className={cn("relative flex flex-col", destaque && "border-2 border-primary shadow-lg")}>
              {destaque && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1">
                  Mais vantajoso · economize {formatBRL(economia)}
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{p.nome}</CardTitle>
                <p className="pt-2">
                  <span className="text-4xl font-extrabold">{formatBRL(p.precos.CARTAO)}</span>
                  <span className="text-muted-foreground">/{periodo}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  no cartão, renovação automática
                  {plano === "ANUAL" && ` (equivale a ${formatBRL(p.precos.CARTAO / 12)}/mês)`}
                </p>
                <p className="text-sm font-medium text-accent">
                  ou {formatBRL(p.precos.PIX)} no Pix · {p.diasPix} dias de acesso
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <ul className="grid gap-2 text-sm">
                  {incluso.map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" /> {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto grid gap-2">
                  <Button size="lg" variant={destaque ? "default" : "outline"} asChild>
                    <Link href={`/assinar?plano=${plano}&metodo=CARTAO`}>
                      <CreditCard /> Testar {TRIAL_DIAS} dias grátis no cartão
                    </Link>
                  </Button>
                  <Button size="lg" variant="accent" asChild>
                    <Link href={`/assinar?plano=${plano}&metodo=PIX`}>
                      <QrCode /> Pagar com Pix
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Pagamentos processados com segurança pelo Mercado Pago. Cancele a renovação quando quiser.
      </p>
    </section>
  );
}
