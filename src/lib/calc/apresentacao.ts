import { formatPct } from "@/lib/format";
import type { SimulationResult } from "./motor";

/** Linha "IVA do ano (CBS + IBS)" — ausente em simulações salvas antes da transição ano a ano. */
export function linhaIvaAno(r: SimulationResult): [string, string][] {
  return r.ivaCBS !== undefined && r.ivaIBS !== undefined
    ? [["IVA do ano (CBS + IBS)", `${formatPct(r.ivaCBS)} + ${formatPct(r.ivaIBS)}`]]
    : [];
}

/** Linhas da memória de cálculo com a partilha do DAS (tela e PDF). */
export function linhasPartilha(r: SimulationResult): [string, string][] {
  // Simulações salvas antes da transição ano a ano não têm a partilha detalhada
  if (r.shareICMSISS === undefined) {
    return [
      ["Partilha CBS / IBS no DAS", `${formatPct(r.shareCBS)} / ${formatPct(r.shareIBS)}`],
      ["Parcela que sai do DAS", formatPct(r.shareSai)],
    ];
  }
  const teto = r.tetoISSAplicado && r.tetoISS ? ` (ISS no teto de ${formatPct(r.tetoISS, 1)})` : "";
  return [
    [`CBS / IBS / ICMS-ISS no DAS${teto}`, `${formatPct(r.shareCBS)} / ${formatPct(r.shareIBS)} / ${formatPct(r.shareICMSISS)}`],
    ["Sai do DAS no Híbrido (CBS + IBS)", formatPct(r.shareSai)],
  ];
}
