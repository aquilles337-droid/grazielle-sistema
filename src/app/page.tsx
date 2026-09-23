import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  FileText,
  Gauge,
  Lock,
  Scale,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadForm } from "@/components/landing/lead-form";
import { Pricing } from "@/components/landing/pricing";
import { VereditoBadge } from "@/components/shared/veredito-badge";
import { PREMISSAS_PADRAO, simular } from "@/lib/calc/motor";
import { formatBRL, formatPct } from "@/lib/format";

// Exemplo real rodando o próprio motor de cálculo (gerado no build)
const exemplo = simular({
  empresa: {
    anexo: "I",
    faixa: 3,
    rbt12: 600_000,
    receitaMensal: 50_000,
    pctExportacao: 0,
    pctB2B: 0.8,
    pctComprasCreditaveis: 0.6,
    reducaoSaida: 0,
    reducaoCompras: 0,
  },
  premissas: PREMISSAS_PADRAO,
});

const features = [
  {
    icon: FileText,
    title: "PDF white-label",
    desc: "Relatório corporativo com o nome do seu escritório, pronto para enviar ao cliente e fechar a consultoria.",
  },
  {
    icon: Scale,
    title: "Baseado na LC 214/2025",
    desc: "CBS de 9,21%, IBS de transição, IVA pleno de 26,5%, reduções de alíquota e partilha oficial dos Anexos I a V.",
  },
  {
    icon: Lock,
    title: "Isolamento de dados",
    desc: "Cada contador enxerga apenas as próprias empresas e simulações. Acesso por credencial, sem compartilhamento.",
  },
  {
    icon: Gauge,
    title: "Veredito objetivo",
    desc: "Optar, Negociar, Limítrofe ou Manter — com tolerância de 0,3% da receita para evitar falsos positivos.",
  },
  {
    icon: TrendingUp,
    title: "Repasse mínimo",
    desc: "Descubra quanto do crédito gerado ao cliente B2B precisa voltar em preço para o híbrido valer a pena.",
  },
  {
    icon: Timer,
    title: "Resultado em segundos",
    desc: "O motor roda no navegador: altere uma premissa e veja o impacto instantaneamente, sem planilha.",
  },
];

const passos = [
  { n: "1", title: "Cadastre a empresa", desc: "Razão social e CNPJ. Organize toda a carteira do Simples em um só lugar." },
  { n: "2", title: "Preencha 8 dados", desc: "Anexo, faixa, RBT12, receita, exportação, % B2B, compras e reduções." },
  { n: "3", title: "Entregue o parecer", desc: "Compare Simples puro × Híbrido e exporte o PDF com o veredito." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Calculator className="h-4 w-4" />
            </span>
            Régua do Híbrido
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#como-funciona">Como funciona</a>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#planos">Planos</a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
            <div className="space-y-6">
              <Badge variant="info" className="text-sm">
                Reforma Tributária · LC 214/2025 · Simples Nacional
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Não deixe seu cliente pagar imposto a mais.{" "}
                <span className="text-primary">Simule o impacto da Reforma Tributária em segundos.</span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                A partir de 2027, empresas do Simples podem recolher IBS e CBS por fora e gerar crédito integral para
                clientes B2B. A Régua do Híbrido diz, com números, quando vale a pena — e quanto negociar.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" variant="accent" asChild>
                  <a href="#planos">
                    Assinar agora <ArrowRight />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#como-funciona">Ver como funciona</a>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Feito para contadores", "Sem planilhas", "Relatório com a sua marca"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Preview do resultado */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardDescription>Exemplo · Comércio, Anexo I, faixa 3 · receita de {formatBRL(50_000)}/mês</CardDescription>
                <CardTitle className="flex items-center justify-between">
                  Veredito
                  <VereditoBadge veredito={exemplo.veredito} className="text-sm" />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Custo Simples puro" value={formatBRL(exemplo.custoPuro)} />
                  <Metric label="Custo Híbrido" value={formatBRL(exemplo.custoHib)} />
                  <Metric label="Crédito extra ao cliente B2B" value={formatBRL(exemplo.ganhoCliente)} positive />
                  <Metric label="Repasse mínimo" value={formatPct(exemplo.repasseMin, 1)} />
                </div>
                <div className="rounded-md bg-accent/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Caixa com 50% de repasse</p>
                  <p className="text-2xl font-bold text-accent">{formatBRL(exemplo.caixaComRepasse)}/mês</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Features */}
        <section className="container py-16 md:py-24">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Tudo o que você precisa para a triagem da carteira</h2>
            <p className="mt-3 text-muted-foreground">
              Transforme a Reforma Tributária em uma nova linha de consultoria para o seu escritório.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-16 border-y bg-secondary/40 py-16 md:py-24">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">Como funciona</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {passos.map((p) => (
                <div key={p.n} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {p.n}
                  </span>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Pricing />

        {/* CTA / Formulário */}
        <section id="solicitar" className="container scroll-mt-16 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">Prefere falar com a gente antes de assinar?</h2>
              <p className="text-muted-foreground">
                Deixe seus dados e liberamos uma demonstração guiada. O acesso é exclusivo para contadores com CRC ativo.
              </p>
              <ul className="space-y-2 text-sm">
                {[
                  "Demonstração com casos reais da sua carteira",
                  "Credenciais individuais para o seu escritório",
                  "Suporte na interpretação dos resultados",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Solicitar acesso</CardTitle>
                <CardDescription>Retornamos em até 1 dia útil.</CardDescription>
              </CardHeader>
              <CardContent>
                <LeadForm />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Régua do Híbrido. Ferramenta de triagem — não substitui o parecer profissional.</p>
          <Link href="/login" className="hover:text-foreground">
            Área do contador
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={positive ? "font-semibold text-accent" : "font-semibold"}>{value}</p>
    </div>
  );
}
