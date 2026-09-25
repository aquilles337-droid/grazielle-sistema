/**
 * Motor de cálculo da Régua do Híbrido.
 *
 * Função pura, sem dependências de servidor — roda no client-side para dar
 * resposta instantânea e é reexecutada no servidor ao salvar a simulação
 * (o servidor nunca confia no resultado enviado pelo navegador).
 *
 * Convenção: TODOS os percentuais são frações (0,5 = 50%). Valores em R$.
 */

import { type Anexo, type Faixa, TETO_ISS, getFaixa } from "./tabelas-simples";

export type Horizonte = "2027" | "PLENO";

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
  cbsReferencia: number; // 0,0921
  ibsTransicao: number; // 0,0010
  ivaPleno: number; // 0,265
  repasseEsperado: number; // 0,5
  saldoCredorRecuperavel: boolean; // true = recuperável (padrão)
  horizonte: Horizonte; // "2027": sai só a CBS do DAS; "PLENO": saem CBS + IBS
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
   * substituída). Só Anexos I e II, e só enquanto existir ICMS (horizonte 2027):
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
  shareCBS: number;
  shareIBS: number;
  /** 5ª faixa dos Anexos III/IV em 2027: ISS limitado a 5% da receita, partilha recalculada. */
  tetoISSAplicado: boolean;
  shareSai: number;
  shareTotal: number;
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
  /** A ST foi aplicada? (Anexo I/II, horizonte 2027) */
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

  // 1. Alíquota efetiva
  const aliqEf = aliquotaEfetiva(e.rbt12, tabela.aliquotaNominal, tabela.parcelaDeduzir);

  // 2. Parcela que sai do DAS (partilha de 2027–2028 no horizonte 2027)
  let { shareCBS, shareIBS } = tabela;
  let tetoISSAplicado = false;
  if (p.horizonte === "2027") {
    if (tabela.shareCBS2027 !== undefined) shareCBS = tabela.shareCBS2027;
    // Teto do ISS: acima dele o ISS fica em 5% da receita e o excedente vai para os tributos federais
    if (tabela.cbsExcedente !== undefined && aliqEf * shareIBS > TETO_ISS) {
      tetoISSAplicado = true;
      shareIBS = TETO_ISS / aliqEf;
      shareCBS = ((aliqEf - TETO_ISS) * tabela.cbsExcedente) / aliqEf;
    }
  }
  const shareTotal = shareCBS + shareIBS;
  const shareSai = p.horizonte === "2027" ? shareCBS : shareTotal;

  // 3. Alíquotas do regime regular
  const iva = p.horizonte === "2027" ? p.cbsReferencia + p.ibsTransicao : p.ivaPleno;
  const ivaSaida = iva * (1 - e.reducaoSaida);
  const ivaCompra = iva * (1 - e.reducaoCompras);

  // 4. Segregação
  const recExp = e.receitaMensal * e.pctExportacao;
  const recInt = e.receitaMensal - recExp;
  const comp = e.receitaMensal * e.pctComprasCreditaveis;

  // 5. Cenário A — Simples puro (exportação é imune à fatia CBS/IBS do DAS)
  const dasExp = recExp * aliqEf * (1 - shareTotal);

  // ICMS-ST: na receita com ICMS já retido, o DAS sai sem a parcela do ICMS (shareIBS
  // nos Anexos I/II). Só em 2027 — no IVA pleno o ICMS foi extinto e a ST deixa de existir.
  // O ICMS continua no DAS nos dois cenários em 2027, então a redução é igual em ambos.
  const stAplicada =
    p.horizonte === "2027" && (e.anexo === "I" || e.anexo === "II") && (e.pctSubstituicaoTributaria ?? 0) > 0;
  const recST = stAplicada ? recInt * (e.pctSubstituicaoTributaria ?? 0) : 0;
  const reducaoDasST = recST * aliqEf * shareIBS;

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
    aliquotaNominal: tabela.aliquotaNominal,
    parcelaDeduzir: tabela.parcelaDeduzir,
    aliqEf,
    shareCBS,
    shareIBS,
    tetoISSAplicado,
    shareSai,
    shareTotal,
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
