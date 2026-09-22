/**
 * Tabelas do Simples Nacional (LC 123/2006, Anexos I a V, redação da LC 155/2016).
 *
 * `shareCBS` = participação de PIS + COFINS na partilha da faixa — é a fatia que
 *              a CBS substitui dentro do DAS.
 * `shareIBS` = participação de ICMS (Anexos I e II) ou ISS (Anexos III, IV e V) —
 *              fatia que o IBS substitui dentro do DAS.
 *
 * Na 6ª faixa ICMS/ISS são recolhidos fora do DAS (sublimite), por isso shareIBS = 0.
 * Valores em fração (0,155 = 15,5%).
 */

export type Anexo = "I" | "II" | "III" | "IV" | "V";
export type Faixa = 1 | 2 | 3 | 4 | 5 | 6;

export interface FaixaSimples {
  faixa: Faixa;
  ate: number; // limite superior do RBT12 (R$)
  aliquotaNominal: number;
  parcelaDeduzir: number; // R$
  shareCBS: number;
  shareIBS: number;
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

export const TABELAS_SIMPLES: Record<Anexo, FaixaSimples[]> = {
  // Comércio — PIS+COFINS = 2,76 + 12,74
  I: [
    f(1, 180_000, 4.0, 0, 15.5, 34.0),
    f(2, 360_000, 7.3, 5_940, 15.5, 34.0),
    f(3, 720_000, 9.5, 13_860, 15.5, 33.5),
    f(4, 1_800_000, 10.7, 22_500, 15.5, 33.5),
    f(5, 3_600_000, 14.3, 87_300, 15.5, 33.5),
    f(6, 4_800_000, 19.0, 378_000, 34.4, 0),
  ],
  // Indústria — PIS+COFINS = 2,49 + 11,51
  II: [
    f(1, 180_000, 4.5, 0, 14.0, 32.0),
    f(2, 360_000, 7.8, 5_940, 14.0, 32.0),
    f(3, 720_000, 10.0, 13_860, 14.0, 32.0),
    f(4, 1_800_000, 11.2, 22_500, 14.0, 32.0),
    f(5, 3_600_000, 14.7, 85_500, 14.0, 32.0),
    f(6, 4_800_000, 30.0, 720_000, 25.5, 0),
  ],
  // Serviços (Fator R ≥ 28%, locação de bens móveis etc.)
  III: [
    f(1, 180_000, 6.0, 0, 15.6, 33.5),
    f(2, 360_000, 11.2, 9_360, 17.1, 32.0),
    f(3, 720_000, 13.5, 17_640, 16.6, 32.5),
    f(4, 1_800_000, 16.0, 35_640, 16.6, 32.5),
    f(5, 3_600_000, 21.0, 125_640, 15.6, 33.5),
    f(6, 4_800_000, 33.0, 648_000, 19.5, 0),
  ],
  // Serviços com CPP fora do DAS (construção, vigilância, limpeza, advocacia)
  IV: [
    f(1, 180_000, 4.5, 0, 21.5, 44.5),
    f(2, 360_000, 9.0, 8_100, 25.0, 40.0),
    f(3, 720_000, 10.2, 12_420, 24.0, 40.0),
    f(4, 1_800_000, 14.0, 39_780, 23.0, 40.0),
    f(5, 3_600_000, 22.0, 183_780, 22.0, 40.0),
    f(6, 4_800_000, 33.0, 828_000, 25.0, 0),
  ],
  // Serviços intelectuais (Fator R < 28%)
  V: [
    f(1, 180_000, 15.5, 0, 17.15, 14.0),
    f(2, 360_000, 18.0, 4_500, 17.15, 17.0),
    f(3, 720_000, 19.5, 9_900, 18.15, 19.0),
    f(4, 1_800_000, 20.5, 17_100, 19.15, 21.0),
    f(5, 3_600_000, 23.0, 62_100, 17.15, 23.5),
    f(6, 4_800_000, 30.5, 540_000, 20.0, 0),
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
