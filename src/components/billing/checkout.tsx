"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Copy, CreditCard, Loader2, QrCode, RefreshCw } from "lucide-react";
import { assinarComCartao, consultarPix, iniciarPix, type PixInfo } from "@/actions/billing";
import { CardBrick, type DadosCartao } from "./card-brick";
import { PLANOS, TRIAL_DIAS, type MetodoTipo, type PlanoTipo } from "@/lib/billing/planos";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function Checkout({
  planoInicial,
  metodoInicial,
  emailUsuario,
  pixPendenteId,
  cartaoAtivo,
  trialDisponivel,
  mpPublicKey,
}: {
  planoInicial: PlanoTipo;
  metodoInicial: MetodoTipo;
  emailUsuario: string;
  pixPendenteId?: string;
  cartaoAtivo: boolean;
  trialDisponivel: boolean;
  mpPublicKey: string | null;
}) {
  const [plano, setPlano] = useState<PlanoTipo>(planoInicial);
  const [metodo, setMetodo] = useState<MetodoTipo>(cartaoAtivo ? "PIX" : metodoInicial);
  const [pixId, setPixId] = useState<string | undefined>(pixPendenteId);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Recria o formulário do cartão após recusa (o token do cartão é de uso único)
  const [brickKey, setBrickKey] = useState(0);
  const [confirmarSemTrial, setConfirmarSemTrial] = useState<DadosCartao | null>(null);
  const [assinando, setAssinando] = useState(false);

  function gerarPix() {
    setErro(null);
    start(async () => {
      const res = await iniciarPix({ plano });
      if (!res.ok) return setErro(res.error);
      setPixId(res.data!.pagamentoId);
    });
  }

  async function enviarCartao(dados: DadosCartao, aceitarSemTrial = false) {
    setErro(null);
    setAssinando(true);
    const res = await assinarComCartao({ plano, cardToken: dados.token, docTipo: dados.docTipo, docNumero: dados.docNumero, aceitarSemTrial });
    if (res.ok && res.data?.status === "TRIAL_JA_USADO") {
      setAssinando(false);
      setConfirmarSemTrial(dados);
      return;
    }
    if (!res.ok) {
      setAssinando(false);
      setErro(res.error);
      setBrickKey((k) => k + 1);
      return;
    }
    // Recarrega a página de assinatura com o novo status (e aguarda a 1ª cobrança, se houver)
    window.location.href = "/painel/assinatura?retorno=cartao";
  }

  if (pixId) return <PixPanel id={pixId} onNovo={() => setPixId(undefined)} />;

  if (assinando) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="font-medium">Confirmando seu cartão com o Mercado Pago…</p>
      </div>
    );
  }

  if (confirmarSemTrial) {
    return (
      <div className="grid gap-4 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm">
        <p className="font-semibold text-amber-900">Este CPF já utilizou o teste grátis.</p>
        <p className="text-amber-900">
          Você pode assinar agora com cobrança imediata de {formatBRL(PLANOS[plano].precos.CARTAO)} no cartão informado.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" onClick={() => enviarCartao(confirmarSemTrial, true)}>
            <CreditCard /> Assinar com cobrança imediata
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmarSemTrial(null);
              setBrickKey((k) => k + 1);
            }}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const mensalAno = PLANOS.MENSAL.precos[metodo] * 12;
  const economiaAnual = mensalAno - PLANOS.ANUAL.precos[metodo];
  const textoBotaoCartao = trialDisponivel
    ? `Começar teste grátis de ${TRIAL_DIAS} dias`
    : `Assinar por ${formatBRL(PLANOS[plano].precos.CARTAO)}/${plano === "MENSAL" ? "mês" : "ano"}`;

  return (
    <div className="grid gap-6">
      {/* Forma de pagamento */}
      <div className="grid gap-2">
        <Label>Forma de pagamento</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionCard
            selected={metodo === "CARTAO"}
            disabled={cartaoAtivo}
            onClick={() => setMetodo("CARTAO")}
            icon={<CreditCard className="h-5 w-5" />}
            title="Cartão de crédito"
            badge={trialDisponivel && !cartaoAtivo ? `${TRIAL_DIAS} dias grátis` : undefined}
            desc={
              cartaoAtivo
                ? "Você já tem assinatura ativa no cartão"
                : trialDisponivel
                  ? `Teste grátis por ${TRIAL_DIAS} dias, depois cobrança automática`
                  : "Cobrança automática, sem se preocupar com renovação"
            }
          />
          <OptionCard
            selected={metodo === "PIX"}
            onClick={() => setMetodo("PIX")}
            icon={<QrCode className="h-5 w-5" />}
            title="Pix"
            desc="Mais barato. Libera na hora; renove a cada período"
          />
        </div>
      </div>

      {/* Plano */}
      <div className="grid gap-2">
        <Label>Plano</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["MENSAL", "ANUAL"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlano(p)}
              className={cn(
                "relative rounded-lg border-2 p-4 text-left transition-colors",
                plano === p ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
              )}
            >
              {p === "ANUAL" && (
                <Badge className="absolute right-3 top-3 border-transparent bg-petroleo text-white">
                  Economize {formatBRL(economiaAnual)}
                </Badge>
              )}
              <p className="font-semibold">{PLANOS[p].nome}</p>
              <p className="mt-1 text-2xl font-bold">
                {formatBRL(PLANOS[p].precos[metodo])}
                <span className="text-sm font-normal text-muted-foreground">/{p === "MENSAL" ? "mês" : "ano"}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metodo === "PIX"
                  ? `Acesso por ${PLANOS[p].diasPix} dias a cada pagamento`
                  : `Renovação automática ${p === "MENSAL" ? "todo mês" : "todo ano"} · cancele quando quiser`}
              </p>
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="rounded-md bg-red-50 p-3 text-sm text-destructive">{erro}</p>}

      {metodo === "CARTAO" ? (
        <div className="grid gap-4">
          {trialDisponivel && (
            <div className="rounded-md border border-accent/25 bg-accent/5 p-3 text-sm text-accent">
              <strong>Teste grátis por {TRIAL_DIAS} dias.</strong> Cadastre o cartão e use tudo liberado. A primeira
              cobrança de {formatBRL(PLANOS[plano].precos.CARTAO)} só acontece depois do teste — cancele antes e não paga
              nada.
            </div>
          )}
          {mpPublicKey ? (
            <CardBrick
              key={`${plano}-${brickKey}`}
              publicKey={mpPublicKey}
              valor={PLANOS[plano].precos.CARTAO}
              email={emailUsuario}
              textoBotao={textoBotaoCartao}
              onSubmit={enviarCartao}
            />
          ) : (
            <p className="text-sm text-destructive">Pagamento com cartão indisponível no momento. Use o Pix.</p>
          )}
        </div>
      ) : (
        <>
          <Button size="lg" variant="accent" onClick={gerarPix} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <QrCode />}
            Gerar Pix de {formatBRL(PLANOS[plano].precos.PIX)}
          </Button>
          <p className="text-center text-xs text-muted-foreground">Pagamento processado pelo Mercado Pago.</p>
        </>
      )}
    </div>
  );
}

function OptionCard({
  selected,
  disabled,
  onClick,
  icon,
  title,
  desc,
  badge,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
      )}
    >
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {title}
          {badge && <Badge className="bg-petroleo border-transparent text-white">{badge}</Badge>}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

function PixPanel({ id, onNovo }: { id: string; onNovo: () => void }) {
  const router = useRouter();
  const [info, setInfo] = useState<PixInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let ativo = true;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      const res = await consultarPix(id);
      if (!ativo) return;
      if (!res.ok) return setErro(res.error);
      setInfo(res.data!);
      if (res.data!.status === "APROVADO") {
        router.refresh();
        return;
      }
      if (res.data!.status === "PENDENTE") timer = setTimeout(tick, 5000);
    }
    tick();
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [id, router]);

  if (erro) return <p className="text-sm text-destructive">{erro}</p>;
  if (!info)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (info.status === "APROVADO") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-accent" />
        <p className="text-xl font-bold">Pagamento confirmado!</p>
        <p className="text-muted-foreground">
          Seu acesso está liberado{info.acessoAte ? ` até ${formatDate(info.acessoAte)}` : ""}.
        </p>
        <Button asChild size="lg">
          <a href="/painel">Ir para o simulador</a>
        </Button>
      </div>
    );
  }

  if (info.status !== "PENDENTE") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="font-semibold">
          {info.status === "EXPIRADO" ? "Este QR Code expirou." : "Este pagamento não foi concluído."}
        </p>
        <Button onClick={onNovo}>
          <RefreshCw /> Gerar novo Pix
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-[240px_1fr] md:items-center">
      <div className="mx-auto rounded-lg border bg-white p-3">
        {info.qrBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${info.qrBase64}`} alt="QR Code Pix" className="h-52 w-52" />
        ) : (
          <div className="flex h-52 w-52 items-center justify-center text-sm text-muted-foreground">
            Use o código copia e cola
          </div>
        )}
      </div>
      <div className="grid gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Plano {PLANOS[info.plano as PlanoTipo]?.nome ?? info.plano} · Pix
          </p>
          <p className="text-3xl font-bold">{formatBRL(info.valor)}</p>
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Abra o app do seu banco e escolha pagar com Pix.</li>
          <li>Escaneie o QR Code ou cole o código abaixo.</li>
          <li>O acesso é liberado automaticamente após o pagamento.</li>
        </ol>
        {info.qrCode && (
          <div className="flex gap-2">
            <Input readOnly value={info.qrCode} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(info.qrCode!);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? <Check /> : <Copy />} {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento
          {info.expiraEm ? ` · válido até ${formatDate(info.expiraEm)}` : ""}
        </p>
      </div>
    </div>
  );
}
