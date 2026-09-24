"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import {
  PREMISSAS_PADRAO,
  REGIMES_SAIDA,
  VEREDITO_INFO,
  simular,
  type Horizonte,
  type RegimeSaida,
  type VereditoTipo,
} from "@/lib/calc/motor";
import { ANEXOS, faixaPorRbt12, type Anexo } from "@/lib/calc/tabelas-simples";
import { formatBRL, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { VereditoBadge } from "@/components/shared/veredito-badge";

/*
 * Demonstração real na página de vendas: usa exatamente o mesmo motor de cálculo
 * (simular) e as mesmas premissas padrão do sistema — os números batem com o simulador.
 */

type Dados = {
  anexo: Anexo;
  rbt12: number;
  receitaMensal: number;
  pctB2B: number; // 0–100
  pctCompras: number; // 0–100
  regimeSaida: RegimeSaida;
  reducaoSaida: number; // 0–100
  reducaoCompras: number; // 0–100
};

const EXEMPLOS: { id: string; nome: string; resumo: string; dados: Dados }[] = [
  {
    id: "distribuidora",
    nome: "Distribuidora B2B",
    resumo: "Comércio que vende para outras empresas",
    dados: { anexo: "I", rbt12: 1_800_000, receitaMensal: 150_000, pctB2B: 90, pctCompras: 70, regimeSaida: "PADRAO", reducaoSaida: 0, reducaoCompras: 0 },
  },
  {
    id: "mercadinho",
    nome: "Mercadinho",
    resumo: "Varejo com 55% de cesta básica",
    dados: { anexo: "I", rbt12: 900_000, receitaMensal: 75_000, pctB2B: 5, pctCompras: 70, regimeSaida: "PERSONALIZADO", reducaoSaida: 55, reducaoCompras: 55 },
  },
  {
    id: "consultoria",
    nome: "Consultoria",
    resumo: "Serviços para empresas (Anexo III)",
    dados: { anexo: "III", rbt12: 480_000, receitaMensal: 40_000, pctB2B: 100, pctCompras: 10, regimeSaida: "PADRAO", reducaoSaida: 0, reducaoCompras: 0 },
  },
  {
    id: "salao",
    nome: "Salão de beleza",
    resumo: "Serviços ao consumidor final",
    dados: { anexo: "III", rbt12: 540_000, receitaMensal: 45_000, pctB2B: 0, pctCompras: 20, regimeSaida: "PADRAO", reducaoSaida: 0, reducaoCompras: 0 },
  },
];

const COR_VEREDITO: Record<VereditoTipo, string> = {
  OPTAR: "border-emerald-300 bg-emerald-50",
  NEGOCIAR: "border-sky-300 bg-sky-50",
  LIMITROFE: "border-amber-300 bg-amber-50",
  MANTER: "border-red-300 bg-red-50",
};

function explicacao(v: VereditoTipo, r: ReturnType<typeof simular>, repasse: number) {
  const custo = Math.abs(r.deltaCusto);
  if (r.deltaCusto <= 0) {
    return `No Híbrido a carga cai ${formatBRL(custo)}/mês — ganho sem precisar negociar nada com os clientes.`;
  }
  const base = `No Híbrido a empresa paga ${formatBRL(custo)}/mês a mais, mas os clientes B2B passam a receber ${formatBRL(r.ganhoCliente)}/mês a mais em crédito de IBS/CBS.`;
  if (v === "OPTAR")
    return `${base} Se ${formatPct(repasse, 0)} desse ganho voltar em preço, sobra ${formatBRL(r.caixaComRepasse)}/mês no caixa.`;
  if (v === "NEGOCIAR" && r.repasseMin !== null)
    return `${base} Só compensa se o cliente devolver pelo menos ${formatPct(r.repasseMin, 1)} desse crédito em preço.`;
  if (v === "LIMITROFE") return `${base} Com o repasse esperado, a diferença fica dentro da margem de 0,3% da receita.`;
  return r.ganhoCliente <= 0
    ? `No Híbrido a empresa pagaria ${formatBRL(custo)}/mês a mais e, vendendo para consumidor final, não há cliente que aproveite o crédito.`
    : `${base} Nem com 100% de repasse o Híbrido se paga.`;
}

export function DemoSimulador() {
  const [exemplo, setExemplo] = useState(EXEMPLOS[0].id);
  const [d, setD] = useState<Dados>(EXEMPLOS[0].dados);
  const [horizonte, setHorizonte] = useState<Horizonte>("PLENO");
  const [aberto, setAberto] = useState(false);

  const premissas = { ...PREMISSAS_PADRAO, horizonte };
  const faixa = faixaPorRbt12(d.rbt12);
  const r = useMemo(
    () =>
      simular({
        empresa: {
          anexo: d.anexo,
          faixa,
          rbt12: d.rbt12,
          receitaMensal: d.receitaMensal,
          pctExportacao: 0,
          pctB2B: d.pctB2B / 100,
          pctComprasCreditaveis: d.pctCompras / 100,
          regimeSaida: d.regimeSaida,
          reducaoSaida: d.reducaoSaida / 100,
          reducaoCompras: d.reducaoCompras / 100,
        },
        premissas: { ...PREMISSAS_PADRAO, horizonte },
      }),
    [d, faixa, horizonte],
  );

  const escolher = (id: string) => {
    const e = EXEMPLOS.find((x) => x.id === id)!;
    setExemplo(id);
    setD(e.dados);
  };
  const alterar = <K extends keyof Dados>(k: K, v: Dados[K]) => {
    setExemplo("");
    setD((x) => ({ ...x, [k]: v }));
  };
  const num = (s: string, max = Infinity) => Math.min(Math.max(Number(s.replace(",", ".")) || 0, 0), max);

  return (
    <Card id="demonstracao" className="scroll-mt-24 overflow-hidden border-t-4 border-t-accent shadow-xl">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Demonstração real</p>
          <span className="text-xs text-muted-foreground">mesmo cálculo do sistema · LC 214/2025</span>
        </div>

        {/* Exemplos prontos */}
        <div className="grid grid-cols-2 gap-2">
          {EXEMPLOS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => escolher(e.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-left transition-colors",
                exemplo === e.id ? "border-accent bg-accent/10" : "hover:border-accent/50",
              )}
            >
              <span className="block text-sm font-semibold">{e.nome}</span>
              <span className="block text-xs text-muted-foreground">{e.resumo}</span>
            </button>
          ))}
        </div>

        {/* Dados (editáveis) */}
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-left text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
            {ANEXOS.find((a) => a.value === d.anexo)?.label.split(" — ")[0]} · {faixa}ª faixa · receita {formatBRL(d.receitaMensal)}/mês ·
            B2B {d.pctB2B}% · compras {d.pctCompras}%
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium text-accent">
            {aberto ? "Ocultar" : "Ajustar"} <ChevronDown className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")} />
          </span>
        </button>

        {aberto && (
          <div className="grid grid-cols-2 gap-3 rounded-md border p-3">
            <Campo label="Anexo">
              <NativeSelect value={d.anexo} onChange={(e) => alterar("anexo", e.target.value as Anexo)}>
                {ANEXOS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </NativeSelect>
            </Campo>
            <Campo label="Horizonte">
              <NativeSelect value={horizonte} onChange={(e) => setHorizonte(e.target.value as Horizonte)}>
                <option value="PLENO">IVA pleno (2033)</option>
                <option value="2027">Transição 2027</option>
              </NativeSelect>
            </Campo>
            <Campo label="RBT12 (R$)">
              <Input type="number" min={0} value={d.rbt12} onChange={(e) => alterar("rbt12", num(e.target.value, 4_800_000))} />
            </Campo>
            <Campo label="Receita mensal (R$)">
              <Input type="number" min={0} value={d.receitaMensal} onChange={(e) => alterar("receitaMensal", num(e.target.value))} />
            </Campo>
            <Campo label="% B2B">
              <Input type="number" min={0} max={100} value={d.pctB2B} onChange={(e) => alterar("pctB2B", num(e.target.value, 100))} />
            </Campo>
            <Campo label="% Compras creditáveis">
              <Input type="number" min={0} max={500} value={d.pctCompras} onChange={(e) => alterar("pctCompras", num(e.target.value, 500))} />
            </Campo>
            <Campo label="Regime na saída" className="col-span-2">
              <NativeSelect
                value={d.regimeSaida}
                onChange={(e) => {
                  const reg = e.target.value as RegimeSaida;
                  const red = REGIMES_SAIDA[reg].reducao;
                  setExemplo("");
                  setD((x) => ({ ...x, regimeSaida: reg, reducaoSaida: red === null ? x.reducaoSaida : red * 100 }));
                }}
              >
                {(Object.keys(REGIMES_SAIDA) as RegimeSaida[]).map((k) => (
                  <option key={k} value={k}>
                    {REGIMES_SAIDA[k].label}
                  </option>
                ))}
              </NativeSelect>
            </Campo>
            <Campo label="Redução na saída (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={d.reducaoSaida}
                onChange={(e) => alterar("reducaoSaida", num(e.target.value, 100))}
              />
            </Campo>
            <Campo label="Redução nas compras (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={d.reducaoCompras}
                onChange={(e) => alterar("reducaoCompras", num(e.target.value, 100))}
              />
            </Campo>
          </div>
        )}

        {d.receitaMensal > 0 && (
          <>
            {/* Veredito + explicação */}
            <div className={cn("rounded-md border-2 p-4", COR_VEREDITO[r.veredito])}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Veredito</p>
                <VereditoBadge veredito={r.veredito} />
              </div>
              <p className="mt-1 text-lg font-bold">{VEREDITO_INFO[r.veredito].titulo}</p>
              <p className="mt-1 text-sm text-foreground/80">{explicacao(r.veredito, r, premissas.repasseEsperado)}</p>
            </div>

            {/* Comparativo */}
            <div className="overflow-hidden rounded-md border text-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span>Mensal</span>
                <span className="w-24 text-right">Simples puro</span>
                <span className="w-24 text-right">Híbrido</span>
              </div>
              {(
                [
                  ["DAS", r.dasPuro, r.dasHib],
                  ["IBS/CBS por fora (líquido)", 0, r.ivaLiq],
                  ["Custo tributário", r.custoPuro, r.custoHib],
                  ["Crédito gerado ao cliente", r.credPuro, r.credHib],
                ] as const
              ).map(([k, a, b], i) => (
                <div
                  key={k}
                  className={cn("grid grid-cols-[1fr_auto_auto] gap-x-4 border-t px-3 py-1.5 tabular-nums", i === 2 && "font-semibold")}
                >
                  <span className="text-muted-foreground">{k}</span>
                  <span className="w-24 text-right">{formatBRL(a)}</span>
                  <span className="w-24 text-right">{formatBRL(b)}</span>
                </div>
              ))}
            </div>

            {/* Indicadores */}
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="Caixa sem negociar" valor={r.caixaSemNegociar} />
              <Kpi label={`Caixa c/ repasse de ${formatPct(premissas.repasseEsperado, 0)}`} valor={r.caixaComRepasse} />
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Repasse mínimo</p>
                <p className="font-semibold">
                  {r.repasseMin === null ? "Inviável" : r.repasseMin <= 0 ? "Não precisa" : formatPct(r.repasseMin, 1)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Alíquota efetiva do DAS</p>
                <p className="font-semibold">{formatPct(r.aliqEf, 2)}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("grid gap-1", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-semibold", valor > 0 ? "text-emerald-700" : valor < 0 ? "text-red-700" : "")}>
        {valor > 0 ? "+" : ""}
        {formatBRL(valor)}/mês
      </p>
    </div>
  );
}
