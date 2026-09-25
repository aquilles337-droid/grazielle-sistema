/**
 * Tabelas do Simples Nacional (LC 123/2006, Anexos I a V) na redação da LC 214/2025
 * (Anexos XVIII a XXII) com as alterações da LC 227/2026 (Anexos XX e XXI).
 *
 * Base (valores das tabelas "a partir de 2033", iguais à partilha anterior à reforma):
 * `shareCBS` = fatia da CBS (antigo PIS + COFINS) na partilha da faixa.
 * `shareIBS` = fatia do IBS quando pleno (antigo ICMS nos Anexos I e II, ISS nos III a V).
 *
 * A partilha de cada ano de transição segue a lei:
 * - 2027–2028: CBS + IBS (0,1%) somam `shareCBS`; ICMS/ISS continuam com `shareIBS`.
 * - 2029–2032: CBS = `shareCBS`; IBS = 10%, 20%, 30% e 40% de `shareIBS`; o ICMS/ISS fica com o restante.
 * - 2033 em diante: CBS = `shareCBS`; IBS = `shareIBS`.
 * Na 6ª faixa ICMS/ISS/IBS são recolhidos fora do DAS (sublimite), por isso shareIBS = 0.
 * Valores em fração (0,155 = 15,5%).
 */

export type Anexo = "I" | "II" | "III" | "IV" | "V";
export type Faixa = 1 | 2 | 3 | 4 | 5 | 6;

/** Horizonte da simulação: ano de apuração do Simples durante a transição. */
export type Horizonte = "2027" | "2029" | "2030" | "2031" | "2032" | "PLENO";

export const HORIZONTES: { value: Horizonte; label: string }[] = [
  { value: "2027", label: "Transição 2027–2028" },
  { value: "2029", label: "2029" },
  { value: "2030", label: "2030" },
  { value: "2031", label: "2031" },
  { value: "2032", label: "2032" },
  { value: "PLENO", label: "IVA pleno (2033 em diante)" },
];

export const horizonteLabel = (h: Horizonte) => HORIZONTES.find((x) => x.value === h)?.label ?? h;

/** Fração do antigo ICMS/ISS que já virou IBS dentro do DAS (LC 214/2025, Anexos XVIII a XXII). */
export const FRACAO_IBS: Record<Horizonte, number> = {
  "2027": 0,
  "2029": 0.1,
  "2030": 0.2,
  "2031": 0.3,
  "2032": 0.4,
  PLENO: 1,
};

/**
 * Teto do ISS no DAS (5ª faixa dos Anexos III e IV) e repartição do excedente
 * (alíquota efetiva − teto) entre CBS e IBS. LC 214/2025, Anexos XX e XXI, na redação
 * da LC 227/2026. Sem ISS a partir de 2033.
 */
export const TETO_ISS: Record<Exclude<Horizonte, "PLENO">, { teto: number; III: { cbs: number; ibs: number }; IV: { cbs: number; ibs: number } }> = {
  "2027": { teto: 0.05, III: { cbs: 0.232, ibs: 0.0026 }, IV: { cbs: 0.3627, ibs: 0.004 } },
  "2029": { teto: 0.045, III: { cbs: 0.2233, ibs: 0.048 }, IV: { cbs: 0.3438, ibs: 0.0625 } },
  "2030": { teto: 0.04, III: { cbs: 0.2131, ibs: 0.0915 }, IV: { cbs: 0.3235, ibs: 0.1176 } },
  "2031": { teto: 0.035, III: { cbs: 0.2038, ibs: 0.1313 }, IV: { cbs: 0.3056, ibs: 0.1667 } },
  "2032": { teto: 0.03, III: { cbs: 0.1952, ibs: 0.1677 }, IV: { cbs: 0.2895, ibs: 0.2105 } },
};

export interface FaixaSimples {
  faixa: Faixa;
  ate: number; // limite superior do RBT12 (R$)
  aliquotaNominal: number;
  parcelaDeduzir: number; // R$
  shareCBS: number;
  shareIBS: number;
  /** 6ª faixa em 2027–2028: alíquota nominal reduzida em 0,1 p.p. e partilha da CBS própria. */
  nominal2027?: number;
  shareCBS2027?: number;
}

const f = (
  faixa: Faixa,
  ate: number,
  aliquotaNominal: number,
  parcelaDeduzir: number,
  pisCofins: number,
  icmsIss: number,
): FaixaSimples => ({
  faixa,
  ate,
  aliquotaNominal: aliquotaNominal / 100,
  parcelaDeduzir,
  shareCBS: pisCofins / 100,
  shareIBS: icmsIss / 100,
});

/** 6ª faixa com os valores próprios de 2027–2028. */
const f6 = (base: FaixaSimples, nominal2027: number, cbs2027: number): FaixaSimples => ({
  ...base,
  nominal2027: nominal2027 / 100,
  shareCBS2027: cbs2027 / 100,
});

export const TABELAS_SIMPLES: Record<Anexo, FaixaSimples[]> = {
  // Comércio
  I: [
    f(1, 180_000, 4.0, 0, 15.5, 34.0),
    f(2, 360_000, 7.3, 5_940, 15.5, 34.0),
    f(3, 720_000, 9.5, 13_860, 15.5, 33.5),
    f(4, 1_800_000, 10.7, 22_500, 15.5, 33.5),
    f(5, 3_600_000, 14.3, 87_300, 15.5, 33.5),
    f6(f(6, 4_800_000, 19.0, 378_000, 34.4, 0), 18.9, 34.02),
  ],
  // Indústria
  II: [
    f(1, 180_000, 4.5, 0, 14.0, 32.0),
    f(2, 360_000, 7.8, 5_940, 14.0, 32.0),
    f(3, 720_000, 10.0, 13_860, 14.0, 32.0),
    f(4, 1_800_000, 11.2, 22_500, 14.0, 32.0),
    f(5, 3_600_000, 14.7, 85_500, 14.0, 32.0),
    f6(f(6, 4_800_000, 30.0, 720_000, 25.5, 0), 29.9, 25.22),
  ],
  // Serviços (Fator R ≥ 28%, locação de bens móveis etc.)
  III: [
    f(1, 180_000, 6.0, 0, 15.6, 33.5),
    f(2, 360_000, 11.2, 9_360, 17.1, 32.0),
    f(3, 720_000, 13.5, 17_640, 16.6, 32.5),
    f(4, 1_800_000, 16.0, 35_640, 16.6, 32.5),
    f(5, 3_600_000, 21.0, 125_640, 15.6, 33.5),
    f6(f(6, 4_800_000, 33.0, 648_000, 19.5, 0), 32.9, 19.29),
  ],
  // Serviços com CPP fora do DAS (construção, vigilância, limpeza, advocacia)
  IV: [
    f(1, 180_000, 4.5, 0, 21.5, 44.5),
    f(2, 360_000, 9.0, 8_100, 25.0, 40.0),
    f(3, 720_000, 10.2, 12_420, 24.0, 40.0),
    f(4, 1_800_000, 14.0, 39_780, 23.0, 40.0),
    f(5, 3_600_000, 22.0, 183_780, 22.0, 40.0),
    f6(f(6, 4_800_000, 33.0, 828_000, 25.0, 0), 32.9, 24.7),
  ],
  // Serviços intelectuais (Fator R < 28%)
  V: [
    f(1, 180_000, 15.5, 0, 17.15, 14.0),
    f(2, 360_000, 18.0, 4_500, 17.15, 17.0),
    f(3, 720_000, 19.5, 9_900, 18.15, 19.0),
    f(4, 1_800_000, 20.5, 17_100, 19.15, 21.0),
    f(5, 3_600_000, 23.0, 62_100, 17.15, 23.5),
    f6(f(6, 4_800_000, 30.5, 540_000, 20.0, 0), 30.4, 19.78),
  ],
};

export const ANEXOS: { value: Anexo; label: string }[] = [
  { value: "I", label: "Anexo I — Comércio" },
  { value: "II", label: "Anexo II — Indústria" },
  { value: "III", label: "Anexo III — Serviços" },
  { value: "IV", label: "Anexo IV — Serviços (CPP fora)" },
  { value: "V", label: "Anexo V — Serviços intelectuais" },
];

export const LIMITE_SIMPLES = 4_800_000;

export function getFaixa(anexo: Anexo, faixa: Faixa): FaixaSimples {
  const row = TABELAS_SIMPLES[anexo]?.[faixa - 1];
  if (!row) throw new Error(`Faixa inválida: Anexo ${anexo}, faixa ${faixa}`);
  return row;
}

/** Faixa correspondente ao RBT12 (útil para sugerir/validar a faixa informada). */
export function faixaPorRbt12(rbt12: number): Faixa {
  const idx = TABELAS_SIMPLES.I.findIndex((r) => rbt12 <= r.ate);
  return (idx === -1 ? 6 : idx + 1) as Faixa;
}
