"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { TOUR_EXEMPLO_EVENTO } from "@/components/tour/tours";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { saveSimulation } from "@/actions/simulations";
import {
  PREMISSAS_PADRAO,
  REGIMES_SAIDA,
  regimePorReducao,
  simular,
  VEREDITO_INFO,
  type Horizonte,
  type RegimeSaida,
  type SimulationInput,
  type SimulationResult,
  type VereditoTipo,
} from "@/lib/calc/motor";
import { ANEXOS, faixaPorRbt12, LIMITE_SIMPLES, type Anexo, type Faixa } from "@/lib/calc/tabelas-simples";
import { formatBRL, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { VereditoBadge } from "@/components/shared/veredito-badge";

/** Estado do formulário: percentuais em 0–100 (como o contador digita), valores em R$. */
type FormState = {
  anexo: Anexo;
  faixa: Faixa;
  rbt12: string;
  receitaMensal: string;
  pctExportacao: string;
  pctB2B: string;
  pctComprasCreditaveis: string;
  pctST: string;
  regimeSaida: RegimeSaida;
  reducaoSaida: string;
  reducaoCompras: string;
  cbsReferencia: string;
  ibsTransicao: string;
  ivaPleno: string;
  repasseEsperado: string;
  saldoCredorRecuperavel: boolean;
  horizonte: Horizonte;
};

const pct = (v: number) => String(Math.round(v * 1e6) / 1e4);
const num = (s: string) => {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const frac = (s: string) => Math.max(num(s), 0) / 100;

function toForm(input?: SimulationInput): FormState {
  const e = input?.empresa;
  const p = input?.premissas ?? PREMISSAS_PADRAO;
  return {
    anexo: e?.anexo ?? "I",
    faixa: e?.faixa ?? 1,
    rbt12: e ? String(e.rbt12) : "",
    receitaMensal: e ? String(e.receitaMensal) : "",
    pctExportacao: e ? pct(e.pctExportacao) : "0",
    pctB2B: e ? pct(e.pctB2B) : "50",
    pctComprasCreditaveis: e ? pct(e.pctComprasCreditaveis) : "40",
    pctST: e?.pctSubstituicaoTributaria ? pct(e.pctSubstituicaoTributaria) : "0",
    regimeSaida: e ? (e.regimeSaida ?? regimePorReducao(e.reducaoSaida)) : "PADRAO",
    reducaoSaida: e ? pct(e.reducaoSaida) : "0",
    reducaoCompras: e ? pct(e.reducaoCompras) : "0",
    cbsReferencia: pct(p.cbsReferencia),
    ibsTransicao: pct(p.ibsTransicao),
    ivaPleno: pct(p.ivaPleno),
    repasseEsperado: pct(p.repasseEsperado),
    saldoCredorRecuperavel: p.saldoCredorRecuperavel,
    horizonte: p.horizonte,
  };
}

function toInput(f: FormState): SimulationInput {
  return {
    empresa: {
      anexo: f.anexo,
      faixa: f.faixa,
      rbt12: Math.max(num(f.rbt12), 0),
      receitaMensal: Math.max(num(f.receitaMensal), 0),
      pctExportacao: Math.min(frac(f.pctExportacao), 1),
      pctB2B: Math.min(frac(f.pctB2B), 1),
      pctComprasCreditaveis: Math.min(frac(f.pctComprasCreditaveis), 5),
      // ICMS-ST só existe nos Anexos I e II (comércio e indústria)
      pctSubstituicaoTributaria: f.anexo === "I" || f.anexo === "II" ? Math.min(frac(f.pctST), 1) : 0,
      regimeSaida: f.regimeSaida,
      reducaoSaida: Math.min(frac(f.reducaoSaida), 1),
      reducaoCompras: Math.min(frac(f.reducaoCompras), 1),
    },
    premissas: {
      cbsReferencia: Math.min(frac(f.cbsReferencia), 1),
      ibsTransicao: Math.min(frac(f.ibsTransicao), 1),
      ivaPleno: Math.min(frac(f.ivaPleno), 1),
      repasseEsperado: Math.min(frac(f.repasseEsperado), 1),
      saldoCredorRecuperavel: f.saldoCredorRecuperavel,
      horizonte: f.horizonte,
    },
  };
}

const VEREDITO_STYLE: Record<VereditoTipo, string> = {
  OPTAR: "border-emerald-300 bg-emerald-50",
  NEGOCIAR: "border-sky-300 bg-sky-50",
  LIMITROFE: "border-amber-300 bg-amber-50",
  MANTER: "border-red-300 bg-red-50",
};

export function Simulator({ companyId, initial }: { companyId: string; initial?: SimulationInput }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [titulo, setTitulo] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, startSaving] = useTransition();

  // Apresentação guiada: preenche um exemplo (só com o formulário vazio) para mostrar os resultados
  useEffect(() => {
    const exemplo = () =>
      setForm((f) =>
        f.receitaMensal
          ? f
          : { ...f, anexo: "I", faixa: 3, rbt12: "600000", receitaMensal: "50000", pctB2B: "80", pctComprasCreditaveis: "60" },
      );
    window.addEventListener(TOUR_EXEMPLO_EVENTO, exemplo);
    return () => window.removeEventListener(TOUR_EXEMPLO_EVENTO, exemplo);
  }, []);

  const input = useMemo(() => toInput(form), [form]);
  const result = useMemo(() => simular(input), [input]);
  const pronto = input.empresa.receitaMensal > 0;

  const faixaSugerida = input.empresa.rbt12 > 0 ? faixaPorRbt12(input.empresa.rbt12) : null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFeedback(null);
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onRbt12 = (v: string) => {
    setFeedback(null);
    setForm((f) => {
      const n = num(v);
      return { ...f, rbt12: v, faixa: n > 0 ? faixaPorRbt12(n) : f.faixa };
    });
  };

  // Regime de alíquota na saída: preenche a redução correspondente (exceto personalizado)
  const onRegime = (regime: RegimeSaida) => {
    setFeedback(null);
    const r = REGIMES_SAIDA[regime].reducao;
    setForm((f) => ({ ...f, regimeSaida: regime, reducaoSaida: r === null ? f.reducaoSaida : pct(r) }));
  };

  // Redução digitada à mão: identifica o regime (ou marca como personalizado)
  const onReducaoSaida = (v: string) => {
    setFeedback(null);
    setForm((f) => ({ ...f, reducaoSaida: v, regimeSaida: regimePorReducao(Math.min(frac(v), 1)) }));
  };

  function onSave() {
    startSaving(async () => {
      const res = await saveSimulation({ companyId, titulo: titulo || undefined, input });
      if (res.ok) {
        setFeedback({ ok: true, msg: "Simulação salva no histórico." });
        setTitulo("");
        router.refresh();
      } else {
        setFeedback({ ok: false, msg: res.error });
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      {/* ---------- Inputs ---------- */}
      <div className="grid h-fit gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div data-tour="sim-anexo" className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="Anexo do Simples">
                <NativeSelect value={form.anexo} onChange={(e) => set("anexo", e.target.value as Anexo)}>
                  {ANEXOS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Faixa">
                <NativeSelect value={form.faixa} onChange={(e) => set("faixa", Number(e.target.value) as Faixa)}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}ª
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {faixaSugerida && faixaSugerida !== form.faixa && (
              <p className="-mt-2 text-xs text-amber-700">Pelo RBT12 informado, a faixa seria a {faixaSugerida}ª.</p>
            )}
            <div data-tour="sim-receitas" className="grid grid-cols-2 gap-3">
              <Field label="RBT12 (R$)">
                <Input type="number" min={0} step="0.01" value={form.rbt12} onChange={(e) => onRbt12(e.target.value)} />
              </Field>
              <Field label="Receita mensal (R$)">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.receitaMensal}
                  onChange={(e) => set("receitaMensal", e.target.value)}
                />
              </Field>
            </div>
            {input.empresa.rbt12 > LIMITE_SIMPLES && (
              <p className="-mt-2 text-xs text-destructive">RBT12 acima do limite do Simples (R$ 4,8 mi).</p>
            )}
            <div data-tour="sim-percentuais" className="grid grid-cols-2 gap-3">
              <PctField label="% Exportação" value={form.pctExportacao} onChange={(v) => set("pctExportacao", v)} />
              <PctField label="% B2B (receita interna)" value={form.pctB2B} onChange={(v) => set("pctB2B", v)} />
              <PctField
                label="% Compras creditáveis"
                value={form.pctComprasCreditaveis}
                max={500}
                onChange={(v) => set("pctComprasCreditaveis", v)}
              />
              {(form.anexo === "I" || form.anexo === "II") && (
                <PctField label="% Receita com ICMS-ST" value={form.pctST} onChange={(v) => set("pctST", v)} />
              )}
            </div>
            {(form.anexo === "I" || form.anexo === "II") && num(form.pctST) > 0 && (
              <p className="-mt-2 text-xs text-muted-foreground">
                {form.horizonte === "2027" ? (
                  <>
                    <b>ICMS-ST:</b> na receita com ICMS já retido, o DAS sai sem a parcela do ICMS — nos dois regimes.
                  </>
                ) : (
                  <>
                    <b>ICMS-ST não aplicada no IVA pleno:</b> em 2033 o ICMS já foi extinto e a substituição deixa de
                    existir. Mude o horizonte para <b>Transição 2027</b> para ver o efeito.
                  </>
                )}
              </p>
            )}

            <div data-tour="sim-reducoes" className="grid gap-3 rounded-md border border-dashed border-accent/30 bg-accent/[0.03] p-3">
              <Field label="Regime de alíquota na saída">
                <NativeSelect value={form.regimeSaida} onChange={(e) => onRegime(e.target.value as RegimeSaida)}>
                  {(Object.keys(REGIMES_SAIDA) as RegimeSaida[]).map((k) => (
                    <option key={k} value={k}>
                      {REGIMES_SAIDA[k].label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <p className="-mt-1 text-xs text-muted-foreground">{REGIMES_SAIDA[form.regimeSaida].descricao}</p>
              <div className="grid grid-cols-2 gap-3">
                <PctField label="Redução na saída" value={form.reducaoSaida} onChange={onReducaoSaida} />
                <PctField label="Redução nas compras" value={form.reducaoCompras} onChange={(v) => set("reducaoCompras", v)} />
              </div>
              <p className="text-xs text-muted-foreground">
                <b>Redução nas compras</b>: redução média que os fornecedores aplicam nas vendas para a empresa. Ex.: um
                mercadinho que vende 55% de cesta básica normalmente também compra 55% com alíquota zero — essa parte da
                entrada não gera crédito, então informe 55%.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card data-tour="sim-premissas">
          <CardHeader>
            <CardTitle className="text-base">Premissas</CardTitle>
            <CardDescription>Valores padrão da LC 214/2025 — ajuste se necessário.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horizonte">
                <NativeSelect value={form.horizonte} onChange={(e) => set("horizonte", e.target.value as Horizonte)}>
                  <option value="PLENO">IVA pleno (2033)</option>
                  <option value="2027">Transição 2027</option>
                </NativeSelect>
              </Field>
              <Field label="Saldo credor">
                <NativeSelect
                  value={form.saldoCredorRecuperavel ? "1" : "0"}
                  onChange={(e) => set("saldoCredorRecuperavel", e.target.value === "1")}
                >
                  <option value="1">Recuperável</option>
                  <option value="0">Não recuperável</option>
                </NativeSelect>
              </Field>
              <PctField label="CBS de referência" value={form.cbsReferencia} onChange={(v) => set("cbsReferencia", v)} />
              <PctField label="IBS de transição" value={form.ibsTransicao} onChange={(v) => set("ibsTransicao", v)} />
              <PctField label="IVA pleno" value={form.ivaPleno} onChange={(v) => set("ivaPleno", v)} />
              <PctField label="Repasse esperado" value={form.repasseEsperado} onChange={(v) => set("repasseEsperado", v)} />
            </div>
            <Button
              data-tour="sim-restaurar"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => setForm((f) => ({ ...f, ...premissasPadraoForm() }))}
            >
              <RotateCcw /> Restaurar premissas padrão
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Resultados ---------- */}
      <div className="grid h-fit gap-6">
        {!pronto ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Informe a receita mensal para calcular os cenários.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card data-tour="sim-veredito" className={cn("border-2", VEREDITO_STYLE[result.veredito])}>
              <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Veredito</p>
                  <p className="text-2xl font-bold">{VEREDITO_INFO[result.veredito].titulo}</p>
                  <p className="max-w-lg text-sm text-muted-foreground">{VEREDITO_INFO[result.veredito].descricao}</p>
                </div>
                <VereditoBadge veredito={result.veredito} className="self-start text-sm md:self-center" />
              </CardContent>
            </Card>

            <div data-tour="sim-kpis" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Caixa sem negociar" value={result.caixaSemNegociar} />
              <Kpi label={`Caixa c/ repasse de ${formatPct(input.premissas.repasseEsperado, 0)}`} value={result.caixaComRepasse} />
              <Kpi label="Excedente na cadeia" value={result.excedenteCadeia} />
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Repasse mínimo</p>
                  <p className="text-xl font-bold">
                    {result.repasseMin === null ? "Inviável" : result.repasseMin <= 0 ? "0%" : formatPct(result.repasseMin, 1)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div data-tour="sim-cenarios" className="grid gap-4 lg:grid-cols-2">
              <ScenarioCard
                title="Cenário A — Simples puro"
                subtitle="IBS e CBS dentro do DAS"
                rows={[
                  ["DAS", result.dasPuro],
                  ["Crédito transferido ao cliente", result.credPuro],
                ]}
                total={["Custo tributário", result.custoPuro]}
              />
              <ScenarioCard
                title="Cenário B — Híbrido"
                subtitle="IBS e CBS apurados por fora"
                rows={[
                  ["DAS (sem a parcela IBS/CBS)", result.dasHib],
                  ["Débito IBS/CBS", result.ivaDeb],
                  ["(−) Crédito nas compras", -result.ivaCred],
                  ["IBS/CBS líquido", result.ivaLiq],
                  ["Crédito transferido ao cliente", result.credHib],
                ]}
                total={["Custo tributário", result.custoHib]}
              />
            </div>

            <Card data-tour="sim-memoria">
              <CardHeader>
                <CardTitle className="text-base">Memória de cálculo</CardTitle>
              </CardHeader>
              <CardContent>
                <Memoria result={result} />
              </CardContent>
            </Card>

            <Card data-tour="sim-salvar">
              <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor="titulo">Identificação da simulação (opcional)</Label>
                  <Input
                    id="titulo"
                    placeholder="Ex.: Cenário com 30% de redução"
                    value={titulo}
                    maxLength={160}
                    onChange={(e) => setTitulo(e.target.value)}
                  />
                </div>
                <Button onClick={onSave} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />}
                  Salvar simulação
                </Button>
              </CardContent>
              {feedback && (
                <p className={cn("px-6 pb-4 text-sm", feedback.ok ? "text-accent" : "text-destructive")}>{feedback.msg}</p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function premissasPadraoForm() {
  const f = toForm();
  return {
    cbsReferencia: f.cbsReferencia,
    ibsTransicao: f.ibsTransicao,
    ivaPleno: f.ivaPleno,
    repasseEsperado: f.repasseEsperado,
    saldoCredorRecuperavel: f.saldoCredorRecuperavel,
    horizonte: f.horizonte,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PctField({
  label,
  value,
  onChange,
  max = 100,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <Input type="number" min={0} max={max} step="0.01" value={value} onChange={(e) => onChange(e.target.value)} className="pr-8" />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    </Field>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", value > 0 ? "text-emerald-700" : value < 0 ? "text-red-700" : "")}>
          {formatBRL(value)}
        </p>
      </CardContent>
    </Card>
  );
}

function ScenarioCard({
  title,
  subtitle,
  rows,
  total,
}: {
  title: string;
  subtitle: string;
  rows: [string, number][];
  total: [string, number];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular-nums">{formatBRL(v)}</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-4 border-t pt-2 font-semibold">
            <dt>{total[0]}</dt>
            <dd className="tabular-nums">{formatBRL(total[1])}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function Memoria({ result: r }: { result: SimulationResult }) {
  const items: [string, string][] = [
    ["Alíquota nominal / parcela a deduzir", `${formatPct(r.aliquotaNominal)} / ${formatBRL(r.parcelaDeduzir)}`],
    ["Alíquota efetiva", formatPct(r.aliqEf, 4)],
    ["Partilha CBS / IBS no DAS", `${formatPct(r.shareCBS)} / ${formatPct(r.shareIBS)}`],
    ["Parcela que sai do DAS", formatPct(r.shareSai)],
    ["IVA saída / compras", `${formatPct(r.ivaSaida)} / ${formatPct(r.ivaCompra)}`],
    ["Receita interna / exportação", `${formatBRL(r.recInt)} / ${formatBRL(r.recExp)}`],
    ["Compras creditáveis", formatBRL(r.comp)],
    ...(r.stAplicada
      ? ([
          ["Receita com ICMS-ST", formatBRL(r.recST)],
          ["DAS sem ICMS na ST (cada regime)", `−${formatBRL(r.reducaoDasST)}`],
        ] as [string, string][])
      : []),
    ["Δ custo (Híbrido − Puro)", formatBRL(r.deltaCusto)],
    ["Δ crédito ao cliente", formatBRL(r.deltaCredito)],
    ["Ganho do cliente (× %B2B)", formatBRL(r.ganhoCliente)],
    ["Tolerância (0,3% da receita)", formatBRL(r.tolerancia)],
  ];
  return (
    <dl className="grid gap-x-8 gap-y-2 text-sm md:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-dashed pb-1">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
