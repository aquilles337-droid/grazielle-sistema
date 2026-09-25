/**
 * Motor de cálculo da Régua do Híbrido.
 *
 * Função pura, sem dependências de servidor — roda no client-side para dar
 * resposta instantânea e é reexecutada no servidor ao salvar a simulação
 * (o servidor nunca confia no resultado enviado pelo navegador).
 *
 * Convenção: TODOS os percentuais são frações (0,5 = 50%). Valores em R$.
 */

import { type Anexo, type Faixa, type Horizonte, FRACAO_IBS, TETO_ISS, getFaixa } from "./tabelas-simples";

export type { Horizonte };

/** Redução da CBS em 2027–2028 (LC 214/2025, art. 347): 0,1 p.p., compensada pelo IBS de 0,1%. */
export const REDUCAO_CBS_2027 = 0.001;

/**
 * Regime de alíquota na saída (LC 214/2025). Define a redução aplicada ao IBS/CBS
 * nas vendas — e, portanto, o débito no Híbrido e o crédito que o cliente B2B recebe.
 * "PERSONALIZADO" = redução média digitada (ex.: mix de produtos com regimes diferentes).
 */
export type RegimeSaida = "PADRAO" | "REDUCAO_30" | "REDUCAO_60" | "ALIQUOTA_ZERO" | "PERSONALIZADO";

export const REGIMES_SAIDA: Record<RegimeSaida, { label: string; descricao: string; reducao: number | null }> = {
  PADRAO: { label: "Padrão — sem redução", descricao: "Alíquota cheia de IBS/CBS.", reducao: 0 },
  REDUCAO_30: {
    label: "Redução de 30%",
    descricao: "Profissões intelectuais regulamentadas (advogados, contadores, engenheiros, arquitetos etc.).",
    reducao: 0.3,
  },
  REDUCAO_60: {
    label: "Redução de 60%",
    descricao:
      "Saúde, educação, dispositivos médicos e de acessibilidade, medicamentos, alimentos e higiene listados, insumos agropecuários, cultura e outros da lista legal.",
    reducao: 0.6,
  },
  ALIQUOTA_ZERO: {
    label: "Alíquota zero",
    descricao: "Cesta Básica Nacional, hortifrúti, ovos, medicamentos e dispositivos específicos listados.",
    reducao: 1,
  },
  PERSONALIZADO: {
    label: "Personalizado (redução média)",
    descricao: "Informe a redução média ponderada das vendas (ex.: parte cesta básica, parte alíquota cheia).",
    reducao: null,
  },
};

/** Identifica o regime a partir de uma redução já informada. */
export function regimePorReducao(reducao: number): RegimeSaida {
  const achado = (Object.keys(REGIMES_SAIDA) as RegimeSaida[]).find(
    (k) => REGIMES_SAIDA[k].reducao !== null && Math.abs((REGIMES_SAIDA[k].reducao as number) - reducao) < 1e-9,
  );
  return achado ?? "PERSONALIZADO";
}
export type VereditoTipo = "OPTAR" | "LIMITROFE" | "NEGOCIAR" | "MANTER";

export interface Premissas {
  cbsReferencia: number; // CBS de 2027–2028 (já reduzida em 0,1 p.p.): 0,0911
  ibsTransicao: number; // 0,0010
  ivaPleno: number; // 0,265
  repasseEsperado: number; // 0,5
  saldoCredorRecuperavel: boolean; // true = recuperável (padrão)
  horizonte: Horizonte; // ano de apuração: 2027–2028, 2029 a 2032 ou IVA pleno (2033+)
}

export interface DadosEmpresa {
  anexo: Anexo;
  faixa: Faixa;
  rbt12: number;
  receitaMensal: number;
  pctExportacao: number;
  pctB2B: number; // % B2B na receita interna
  pctComprasCreditaveis: number;
  /** Regime de alíquota na saída (informativo; o cálculo usa reducaoSaida). */
  regimeSaida?: RegimeSaida;
  reducaoSaida: number;
  reducaoCompras: number;
  /**
   * % da receita interna com ICMS já retido por substituição tributária (empresa
   * substituída). Só Anexos I e II, e só enquanto existir ICMS (até 2032):
   * nessa parte da receita o DAS é calculado sem a parcela do ICMS (LC 123, art. 18, §4-A).
   */
  pctSubstituicaoTributaria?: number;
}

export interface SimulationInput {
  empresa: DadosEmpresa;
  premissas: Premissas;
}

export interface SimulationResult {
  // Parâmetros derivados
  aliquotaNominal: number;
  parcelaDeduzir: number;
  aliqEf: number;
  /** Partilha no DAS do ano simulado: CBS, IBS e ICMS/ISS. */
  shareCBS: number;
  shareIBS: number;
  /** Ausente em simulações salvas antes da transição ano a ano. */
  shareICMSISS?: number;
  /** 5ª faixa dos Anexos III/IV: ISS limitado ao teto do ano, partilha recalculada. */
  tetoISSAplicado: boolean;
  tetoISS?: number | null;
  shareSai: number;
  shareTotal: number;
  /** CBS e IBS do regime regular no ano (ausentes em simulações antigas). */
  ivaCBS?: number;
  ivaIBS?: number;
  iva: number;
  ivaSaida: number;
  ivaCompra: number;
  // Segregação
  recExp: number;
  recInt: number;
  comp: number;
  /** Receita com ICMS-ST considerada e a redução que ela gera no DAS (igual nos dois cenários). */
  recST: number;
  reducaoDasST: number;
  /** A ST foi aplicada? (Anexo I/II, enquanto existir ICMS — até 2032) */
  stAplicada: boolean;
  // Cenário A — Simples puro
  dasExp: number;
  dasPuro: number;
  credPuro: number;
  custoPuro: number;
  // Cenário B — Híbrido
  dasHib: number;
  ivaDeb: number;
  ivaCred: number;
  bruto: number;
  ivaLiq: number;
  custoHib: number;
  credHib: number;
  // Indicadores
  deltaCusto: number;
  deltaCredito: number;
  ganhoCliente: number;
  caixaSemNegociar: number;
  caixaComRepasse: number;
  excedenteCadeia: number;
  /** Repasse mínimo (fração). `null` quando não há ganho no cliente que viabilize a negociação. */
  repasseMin: number | null;
  tolerancia: number;
  veredito: VereditoTipo;
}

export const PREMISSAS_PADRAO: Premissas = {
  cbsReferencia: 0.0911,
  ibsTransicao: 0.001,
  ivaPleno: 0.265,
  repasseEsperado: 0.5,
  saldoCredorRecuperavel: true,
  horizonte: "PLENO",
};

export const TOLERANCIA_PCT = 0.003; // 0,3% da receita mensal

/** Alíquota efetiva: (RBT12 × nominal − parcela a deduzir) ÷ RBT12. */
export function aliquotaEfetiva(rbt12: number, nominal: number, parcela: number): number {
  // Início de atividade (RBT12 zero): aplica-se a nominal da faixa.
  if (rbt12 <= 0) return nominal;
  return Math.max((rbt12 * nominal - parcela) / rbt12, 0);
}

export function calcularVeredito(
  r: Pick<SimulationResult, "caixaSemNegociar" | "caixaComRepasse" | "repasseMin" | "tolerancia">,
): VereditoTipo {
  if (r.caixaSemNegociar > r.tolerancia) return "OPTAR";
  if (r.caixaComRepasse > r.tolerancia) return "OPTAR";
  if (Math.abs(r.caixaComRepasse) <= r.tolerancia) return "LIMITROFE";
  if (r.repasseMin !== null && r.repasseMin <= 1) return "NEGOCIAR";
  return "MANTER";
}

export function simular({ empresa: e, premissas: p }: SimulationInput): SimulationResult {
  const tabela = getFaixa(e.anexo, e.faixa);

  // 1. Alíquota efetiva (em 2027–2028 a 6ª faixa tem nominal 0,1 p.p. menor)
  const em2027 = p.horizonte === "2027";
  const nominal = em2027 && tabela.nominal2027 !== undefined ? tabela.nominal2027 : tabela.aliquotaNominal;
  const aliqEf = aliquotaEfetiva(e.rbt12, nominal, tabela.parcelaDeduzir);

  // 2. Partilha do ano (LC 214/2025, Anexos XVIII a XXII; LC 227/2026)
  //    shareSai = CBS + IBS dentro do DAS (é o que sai no Híbrido); o ICMS/ISS fica no DAS.
  const fracIBS = FRACAO_IBS[p.horizonte];
  let shareCBS = em2027 && tabela.shareCBS2027 !== undefined ? tabela.shareCBS2027 : tabela.shareCBS;
  let shareIBS = tabela.shareIBS * fracIBS;
  let shareICMSISS = tabela.shareIBS - shareIBS;
  // Teto do ISS (5ª faixa dos Anexos III e IV): acima dele o ISS fica fixo e o excedente
  // (alíquota efetiva − teto) é repartido pelos coeficientes da lei.
  let tetoISSAplicado = false;
  let tetoISS: number | null = null;
  if (p.horizonte !== "PLENO" && e.faixa === 5 && (e.anexo === "III" || e.anexo === "IV")) {
    const regra = TETO_ISS[p.horizonte];
    if (aliqEf * shareICMSISS > regra.teto) {
      tetoISSAplicado = true;
      tetoISS = regra.teto;
      const coef = regra[e.anexo];
      shareICMSISS = regra.teto / aliqEf;
      shareCBS = ((aliqEf - regra.teto) * coef.cbs) / aliqEf;
      shareIBS = ((aliqEf - regra.teto) * coef.ibs) / aliqEf;
    }
  }
  const shareSai = shareCBS + shareIBS;
  const shareTotal = shareSai + shareICMSISS;

  // 3. Alíquotas do regime regular no ano (LC 214/2025, arts. 344 e 347; ADCT, arts. 127 a 129)
  //    2027–2028: CBS reduzida em 0,1 p.p. + IBS de 0,1%. 2029–2032: CBS cheia + fração do IBS
  //    (a mesma proporção em que o ICMS/ISS vira IBS nas tabelas do Simples). 2033: IVA pleno.
  const cbsCheia = p.cbsReferencia + REDUCAO_CBS_2027;
  const ivaCBS = em2027 ? p.cbsReferencia : cbsCheia;
  const ivaIBS = em2027 ? p.ibsTransicao : Math.max(p.ivaPleno - cbsCheia, 0) * fracIBS;
  const iva = p.horizonte === "PLENO" ? p.ivaPleno : ivaCBS + ivaIBS;
  const ivaSaida = iva * (1 - e.reducaoSaida);
  const ivaCompra = iva * (1 - e.reducaoCompras);

  // 4. Segregação
  const recExp = e.receitaMensal * e.pctExportacao;
  const recInt = e.receitaMensal - recExp;
  const comp = e.receitaMensal * e.pctComprasCreditaveis;

  // 5. Cenário A — Simples puro (exportação é imune à fatia CBS/IBS/ICMS/ISS do DAS)
  const dasExp = recExp * aliqEf * (1 - shareTotal);

  // ICMS-ST: na receita com ICMS já retido, o DAS sai sem a parcela do ICMS (Anexos I/II).
  // Vale enquanto existir ICMS (até 2032); no IVA pleno o ICMS foi extinto e a ST deixa de existir.
  // O ICMS continua no DAS nos dois cenários, então a redução é igual em ambos.
  const stAplicada =
    p.horizonte !== "PLENO" && (e.anexo === "I" || e.anexo === "II") && (e.pctSubstituicaoTributaria ?? 0) > 0;
  const recST = stAplicada ? recInt * (e.pctSubstituicaoTributaria ?? 0) : 0;
  const reducaoDasST = recST * aliqEf * shareICMSISS;

  const dasPuro = recInt * aliqEf - reducaoDasST + dasExp;
  const credPuro = recInt * aliqEf * shareSai;
  const custoPuro = dasPuro;

  // 6. Cenário B — Híbrido
  const dasHib = recInt * aliqEf * (1 - shareSai) - reducaoDasST + dasExp;
  const ivaDeb = recInt * ivaSaida;
  const ivaCred = comp * ivaCompra;
  const bruto = ivaDeb - ivaCred;
  const ivaLiq = p.saldoCredorRecuperavel ? bruto : Math.max(bruto, 0);
  const custoHib = dasHib + ivaLiq;
  const credHib = recInt * ivaSaida;

  // 7. Indicadores
  const deltaCusto = custoHib - custoPuro;
  const deltaCredito = credHib - credPuro;
  const ganhoCliente = deltaCredito * e.pctB2B;
  const caixaSemNegociar = -deltaCusto;
  const caixaComRepasse = ganhoCliente * p.repasseEsperado - deltaCusto;
  const excedenteCadeia = ganhoCliente - deltaCusto;
  const repasseMin = ganhoCliente > 0 ? deltaCusto / ganhoCliente : null;

  // 8. Veredito
  const tolerancia = e.receitaMensal * TOLERANCIA_PCT;
  const veredito = calcularVeredito({ caixaSemNegociar, caixaComRepasse, repasseMin, tolerancia });

  return {
    aliquotaNominal: nominal,
    parcelaDeduzir: tabela.parcelaDeduzir,
    aliqEf,
    shareCBS,
    shareIBS,
    shareICMSISS,
    tetoISSAplicado,
    tetoISS,
    shareSai,
    shareTotal,
    ivaCBS,
    ivaIBS,
    iva,
    ivaSaida,
    ivaCompra,
    recExp,
    recInt,
    comp,
    recST,
    reducaoDasST,
    stAplicada,
    dasExp,
    dasPuro,
    credPuro,
    custoPuro,
    dasHib,
    ivaDeb,
    ivaCred,
    bruto,
    ivaLiq,
    custoHib,
    credHib,
    deltaCusto,
    deltaCredito,
    ganhoCliente,
    caixaSemNegociar,
    caixaComRepasse,
    excedenteCadeia,
    repasseMin,
    tolerancia,
    veredito,
  };
}

export const VEREDITO_INFO: Record<VereditoTipo, { titulo: string; descricao: string }> = {
  OPTAR: {
    titulo: "Optar pelo Híbrido",
    descricao:
      "O regime híbrido gera caixa acima da tolerância, com ou sem negociação de preço. A opção vale por semestre (janeiro ou julho), é feita em setembro ou março e é irretratável no semestre (LC 123, art. 13, §§ 9º e 10).",
  },
  LIMITROFE: {
    titulo: "Limítrofe",
    descricao: "Com o repasse esperado, a diferença de caixa fica dentro da tolerância de 0,3% da receita.",
  },
  NEGOCIAR: {
    titulo: "Negociar repasse",
    descricao: "O híbrido só compensa se o cliente B2B repassar parte do crédito — o repasse mínimo é viável (até 100%).",
  },
  MANTER: {
    titulo: "Manter no Simples puro",
    descricao: "Nem com 100% de repasse do ganho de crédito do cliente o híbrido se paga.",
  },
};
