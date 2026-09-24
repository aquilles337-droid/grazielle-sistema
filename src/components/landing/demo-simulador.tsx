"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import {
  PREMISSAS_PADRAO,
  VEREDITO_INFO,
  simular,
  type RegimeSaida,
  type VereditoTipo,
} from "@/lib/calc/motor";
import { ANEXOS, faixaPorRbt12, type Anexo } from "@/lib/calc/tabelas-simples";
import { formatBRL, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { VereditoBadge } from "@/components/shared/veredito-badge";

/*
 * Demonstração real na página de vendas: 4 casos fixos (não editáveis) calculados
 * pelo mesmo motor do sistema, com as premissas padrão no horizonte de transição 2027.
 */

// Premissas da demonstração: padrão do sistema, horizonte 2027 (CBS 9,11% + IBS 0,1% = 9,21%)
const PREMISSAS_DEMO = { ...PREMISSAS_PADRAO, horizonte: "2027" as const };

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
  if (v === "LIMITROFE") {
    return `A diferença entre os regimes fica dentro da margem de 0,3% da receita (${formatBRL(r.tolerancia)}/mês): na prática, um empate. Vale decidir pelo custo de apuração e pelo perfil dos clientes.`;
  }
  if (r.deltaCusto <= 0) {
    return `No Híbrido a carga cai ${formatBRL(custo)}/mês — ganho sem precisar negociar nada com os clientes.`;
  }
  const base = `No Híbrido a empresa paga ${formatBRL(custo)}/mês a mais, mas os clientes B2B passam a receber ${formatBRL(r.ganhoCliente)}/mês a mais em crédito de IBS/CBS.`;
  if (v === "OPTAR")
    return `${base} Se ${formatPct(repasse, 0)} desse ganho voltar em preço, sobra ${formatBRL(r.caixaComRepasse)}/mês no caixa.`;
  if (v === "NEGOCIAR" && r.repasseMin !== null)
    return `${base} Só compensa se o cliente devolver pelo menos ${formatPct(r.repasseMin, 1)} desse crédito em preço.`;
  return r.ganhoCliente <= 0
    ? `No Híbrido a empresa pagaria ${formatBRL(custo)}/mês a mais e, vendendo para consumidor final, não há cliente que aproveite o crédito.`
    : `${base} Nem com 100% de repasse o Híbrido se paga.`;
}

export function DemoSimulador() {
  const [exemplo, setExemplo] = useState(EXEMPLOS[0].id);
  const d = EXEMPLOS.find((x) => x.id === exemplo)!.dados;
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
        premissas: PREMISSAS_DEMO,
      }),
    [d, faixa],
  );

  return (
    <Card id="demonstracao" className="scroll-mt-24 overflow-hidden border-t-4 border-t-accent shadow-xl">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Demonstração real</p>
          <span className="text-xs text-muted-foreground">mesmo cálculo do sistema · transição 2027</span>
        </div>

        {/* Exemplos prontos */}
        <div className="grid grid-cols-2 gap-2">
          {EXEMPLOS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setExemplo(e.id)}
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

        {/* Dados do exemplo (somente leitura) */}
        <div className="flex items-start gap-2 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            {ANEXOS.find((a) => a.value === d.anexo)?.label} · {faixa}ª faixa · RBT12 {formatBRL(d.rbt12)} · receita{" "}
            {formatBRL(d.receitaMensal)}/mês · B2B {d.pctB2B}% · compras creditáveis {d.pctCompras}%
            {d.reducaoSaida > 0 && ` · redução na saída ${d.reducaoSaida}% e nas compras ${d.reducaoCompras}%`} ·{" "}
            <b className="text-foreground">Transição 2027</b> (CBS 9,11% + IBS 0,1% = 9,21%)
          </span>
        </div>

        {d.receitaMensal > 0 && (
          <>
            {/* Veredito + explicação */}
            <div className={cn("rounded-md border-2 p-4", COR_VEREDITO[r.veredito])}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Veredito</p>
                <VereditoBadge veredito={r.veredito} />
              </div>
              <p className="mt-1 text-lg font-bold">{VEREDITO_INFO[r.veredito].titulo}</p>
              <p className="mt-1 text-sm text-foreground/80">{explicacao(r.veredito, r, PREMISSAS_DEMO.repasseEsperado)}</p>
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
              <Kpi label={`Caixa c/ repasse de ${formatPct(PREMISSAS_DEMO.repasseEsperado, 0)}`} valor={r.caixaComRepasse} />
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
