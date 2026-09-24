import Link from "next/link";
import { DesenvolvidoPor, FaixasDecorativas, Logo } from "@/components/brand/logo";
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  Gauge,
  Lock,
  Scale,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadForm } from "@/components/landing/lead-form";
import { Pricing } from "@/components/landing/pricing";
import { DemoSimulador } from "@/components/landing/demo-simulador";

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
            <Logo />
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
        <section className="relative overflow-hidden">
          <FaixasDecorativas className="absolute -bottom-10 -right-24 hidden w-[720px] opacity-[0.12] lg:block" />
          <div className="container relative grid items-start gap-12 py-16 md:py-20 lg:grid-cols-2">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-sm font-medium text-accent">
                Reforma Tributária · LC 214/2025 · Simples Nacional
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
                Não deixe seu cliente pagar imposto a mais.{" "}
                <span className="text-petroleo-gradient">Simule o impacto da Reforma Tributária em segundos.</span>
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
                  <a href="#demonstracao">Testar a demonstração</a>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["Feito para contadores", "Sem planilhas", "Relatório com a sua marca"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-accent" /> {t}
                  </li>
                ))}
              </ul>
              <DesenvolvidoPor className="pt-2" />
            </div>

            {/* Demonstração real — mesmo motor de cálculo do sistema */}
            <DemoSimulador />
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
              <Card key={title} className="border-b-2 border-b-transparent transition-all hover:border-b-accent hover:shadow-md">
                <CardHeader>
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-grafite text-white shadow-sm">
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
        <section id="como-funciona" className="relative scroll-mt-16 overflow-hidden bg-grafite py-16 text-white md:py-24">
          <FaixasDecorativas className="absolute -bottom-24 -left-20 w-[520px] opacity-30" />
          <div className="container relative">
            <h2 className="mb-12 text-center text-3xl font-bold tracking-tight">Como funciona</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {passos.map((p) => (
                <div key={p.n} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-petroleo text-lg font-bold text-white shadow">
                    {p.n}
                  </span>
                  <div>
                    <h3 className="font-semibold">{p.title}</h3>
                    <p className="text-sm text-white/70">{p.desc}</p>
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

      <footer className="border-t-4 border-t-accent bg-card py-10">
        <div className="container grid gap-6 text-sm text-muted-foreground md:grid-cols-[1fr_auto] md:items-center">
          <div className="space-y-3">
            <Logo />
            <p>© {new Date().getFullYear()} Régua do Híbrido. Ferramenta de triagem tributária para contadores.</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <DesenvolvidoPor />
            <Link href="/login" className="hover:text-foreground">
              Área do contador
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
