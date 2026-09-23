import Link from "next/link";
import { CalendarCheck, CalendarX, CreditCard } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mpConfigurado } from "@/lib/billing/mercadopago";
import { sincronizarUsuario } from "@/lib/billing/processar";
import { PLANOS, diasRestantes, temAcesso, type MetodoTipo, type PlanoTipo } from "@/lib/billing/planos";
import { podeUsarTrial } from "@/actions/billing";
import { formatBRL, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkout } from "@/components/billing/checkout";
import { CancelarAssinaturaButton } from "@/components/billing/cancelar-assinatura-button";
import { AutoRefresh } from "@/components/billing/auto-refresh";

const STATUS_PAGAMENTO: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
  APROVADO: { label: "Aprovado", variant: "success" },
  PENDENTE: { label: "Pendente", variant: "warning" },
  RECUSADO: { label: "Recusado", variant: "danger" },
  CANCELADO: { label: "Cancelado", variant: "secondary" },
  EXPIRADO: { label: "Expirado", variant: "secondary" },
  ESTORNADO: { label: "Estornado", variant: "danger" },
};

const STATUS_ASSINATURA: Record<string, string> = {
  PENDENTE: "Aguardando confirmação",
  ATIVA: "Ativa",
  PAUSADA: "Pausada",
  CANCELADA: "Cancelada",
};

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string; metodo?: string; expirado?: string; retorno?: string }>;
}) {
  const sp = await searchParams;
  const sessao = await requireUser();

  // Confere pendências direto no Mercado Pago (não depende só do webhook)
  if (mpConfigurado()) await sincronizarUsuario(sessao.id).catch((e) => console.error(e));

  const agora = new Date();
  const [user, assinatura, pixPendente, pagamentos, trialDisponivel] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: sessao.id }, select: { role: true, acessoAte: true, email: true } }),
    prisma.assinatura.findFirst({
      where: { userId: sessao.id, status: { in: ["ATIVA", "PAUSADA", "PENDENTE"] } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pagamento.findFirst({
      where: { userId: sessao.id, metodo: "PIX", status: "PENDENTE", pixExpiraEm: { gt: agora } },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.pagamento.findMany({ where: { userId: sessao.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    podeUsarTrial(),
  ]);

  const cartaoAtivo = assinatura?.status === "ATIVA" || assinatura?.status === "PAUSADA";
  const acesso = temAcesso(user, agora, assinatura?.status === "ATIVA");
  const dias = diasRestantes(user.acessoAte, agora);
  const planoInicial: PlanoTipo = sp.plano === "ANUAL" ? "ANUAL" : "MENSAL";
  const metodoInicial: MetodoTipo = sp.metodo === "PIX" ? "PIX" : "CARTAO";
  const aguardandoCartao = sp.retorno === "cartao" && !acesso;
  // Em teste grátis: assinatura com trial ativa e nenhuma cobrança aprovada ainda
  const emTrial =
    assinatura?.status === "ATIVA" &&
    assinatura.trialDias > 0 &&
    !pagamentos.some((p) => p.assinaturaId === assinatura.id && p.status === "APROVADO");

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      {aguardandoCartao && <AutoRefresh seconds={8} />}

      {/* Situação */}
      <Card className={acesso ? "border-l-4 border-l-accent" : "border-l-4 border-l-amber-400"}>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {acesso ? (
              <CalendarCheck className="mt-0.5 h-6 w-6 text-accent" />
            ) : (
              <CalendarX className="mt-0.5 h-6 w-6 text-amber-600" />
            )}
            <div>
              {user.role === "ADMIN" ? (
                <p className="font-semibold">Administrador — acesso sempre liberado</p>
              ) : acesso && user.acessoAte ? (
                <>
                  <p className="font-semibold">
                    {emTrial ? "Teste grátis ativo até " : "Acesso ativo até "}
                    {formatDate(user.acessoAte)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {emTrial
                      ? `A primeira cobrança de ${formatBRL(Number(assinatura!.valor))} será feita no cartão ao fim do teste. Cancele antes se não quiser continuar.`
                      : cartaoAtivo
                      ? "Renovação automática no cartão."
                      : `Faltam ${dias} dia${dias === 1 ? "" : "s"}. Renove antes para não perder o acesso — os dias se somam.`}
                  </p>
                </>
              ) : aguardandoCartao ? (
                <>
                  <p className="font-semibold">Confirmando sua assinatura no cartão…</p>
                  <p className="text-sm text-muted-foreground">
                    Assim que o Mercado Pago confirmar o cartão, seu acesso é liberado automaticamente.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold">
                    {user.acessoAte ? `Seu acesso venceu em ${formatDate(user.acessoAte)}` : "Escolha um plano para liberar o acesso"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sp.expirado ? "Para usar o simulador, é preciso ter uma assinatura em dia." : "O acesso é liberado assim que o pagamento é aprovado."}
                  </p>
                </>
              )}
            </div>
          </div>
          {acesso && (
            <Button asChild>
              <Link href="/painel">Ir para o simulador</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Assinatura no cartão */}
      {assinatura && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Assinatura no cartão
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p>
                Plano {PLANOS[assinatura.plano].nome} · {formatBRL(Number(assinatura.valor))}/
                {assinatura.plano === "MENSAL" ? "mês" : "ano"}
              </p>
              <p className="text-muted-foreground">
                Status: {emTrial ? "Em teste grátis" : STATUS_ASSINATURA[assinatura.status]}
              </p>
            </div>
            <CancelarAssinaturaButton id={assinatura.id} />
          </CardContent>
        </Card>
      )}

      {/* Checkout */}
      <Card>
        <CardHeader>
          <CardTitle>{acesso ? "Renovar ou mudar de plano" : "Assinar a Régua do Híbrido"}</CardTitle>
          <CardDescription>
            Cartão: {formatBRL(PLANOS.MENSAL.precos.CARTAO)}/mês ou {formatBRL(PLANOS.ANUAL.precos.CARTAO)}/ano · Pix:{" "}
            {formatBRL(PLANOS.MENSAL.precos.PIX)} (30 dias) ou {formatBRL(PLANOS.ANUAL.precos.PIX)} (365 dias)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Checkout
            planoInicial={planoInicial}
            metodoInicial={metodoInicial}
            emailUsuario={user.email}
            pixPendenteId={pixPendente?.id}
            cartaoAtivo={cartaoAtivo}
            trialDisponivel={trialDisponivel}
            mpPublicKey={process.env.MP_PUBLIC_KEY ?? null}
          />
        </CardContent>
      </Card>

      {pagamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Acesso até</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagamentos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDate(p.createdAt)}</TableCell>
                    <TableCell>{PLANOS[p.plano].nome}</TableCell>
                    <TableCell>{p.metodo === "PIX" ? "Pix" : "Cartão"}</TableCell>
                    <TableCell>{formatBRL(Number(p.valor))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_PAGAMENTO[p.status].variant}>{STATUS_PAGAMENTO[p.status].label}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      {p.acessoAte ? formatDate(p.acessoAte) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
