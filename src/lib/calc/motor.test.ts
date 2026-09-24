import { describe, expect, it } from "vitest";
import { PREMISSAS_PADRAO, aliquotaEfetiva, calcularVeredito, regimePorReducao, simular, type DadosEmpresa } from "./motor";
import { faixaPorRbt12 } from "./tabelas-simples";

const base: DadosEmpresa = {
  anexo: "I",
  faixa: 3,
  rbt12: 600_000,
  receitaMensal: 50_000,
  pctExportacao: 0,
  pctB2B: 1,
  pctComprasCreditaveis: 0.6,
  reducaoSaida: 0,
  reducaoCompras: 0,
};

describe("aliquotaEfetiva", () => {
  it("aplica a fórmula (RBT12 × nominal − PD) ÷ RBT12", () => {
    expect(aliquotaEfetiva(600_000, 0.095, 13_860)).toBeCloseTo(0.0719, 6);
  });
  it("usa a nominal quando RBT12 é zero", () => {
    expect(aliquotaEfetiva(0, 0.04, 0)).toBe(0.04);
  });
});

describe("simular — cenário pleno, Anexo I faixa 3", () => {
  const r = simular({ empresa: base, premissas: PREMISSAS_PADRAO });

  it("calcula o Simples puro", () => {
    expect(r.aliqEf).toBeCloseTo(0.0719, 6);
    expect(r.shareSai).toBeCloseTo(0.49, 6);
    expect(r.dasPuro).toBeCloseTo(3595, 2);
    expect(r.credPuro).toBeCloseTo(1761.55, 2);
  });

  it("calcula o híbrido", () => {
    expect(r.dasHib).toBeCloseTo(1833.45, 2);
    expect(r.ivaDeb).toBeCloseTo(13250, 2);
    expect(r.ivaCred).toBeCloseTo(7950, 2);
    expect(r.custoHib).toBeCloseTo(7133.45, 2);
  });

  it("calcula indicadores e veredito", () => {
    expect(r.deltaCusto).toBeCloseTo(3538.45, 2);
    expect(r.ganhoCliente).toBeCloseTo(11488.45, 2);
    expect(r.caixaComRepasse).toBeCloseTo(2205.775, 3);
    expect(r.excedenteCadeia).toBeCloseTo(7950, 2);
    expect(r.repasseMin!).toBeCloseTo(3538.45 / 11488.45, 6);
    expect(r.tolerancia).toBeCloseTo(150, 6);
    expect(r.veredito).toBe("OPTAR");
  });
});

describe("simular — horizonte 2027", () => {
  it("retira apenas a CBS do DAS e usa CBS + IBS de transição", () => {
    const r = simular({ empresa: base, premissas: { ...PREMISSAS_PADRAO, horizonte: "2027" } });
    expect(r.shareSai).toBeCloseTo(0.155, 6);
    expect(r.iva).toBeCloseTo(0.0921, 6);
  });
});

describe("saldo credor", () => {
  it("não recuperável zera IVA líquido negativo", () => {
    const empresa = { ...base, pctComprasCreditaveis: 2 };
    const rec = simular({ empresa, premissas: PREMISSAS_PADRAO });
    const naoRec = simular({ empresa, premissas: { ...PREMISSAS_PADRAO, saldoCredorRecuperavel: false } });
    expect(rec.ivaLiq).toBeLessThan(0);
    expect(naoRec.ivaLiq).toBe(0);
  });
});

describe("exportação", () => {
  it("receita 100% exportada não gera débito nem crédito ao cliente", () => {
    const r = simular({ empresa: { ...base, pctExportacao: 1, pctComprasCreditaveis: 0 }, premissas: PREMISSAS_PADRAO });
    expect(r.recInt).toBe(0);
    expect(r.dasPuro).toBeCloseTo(r.dasHib, 6);
    expect(r.ganhoCliente).toBe(0);
    expect(r.repasseMin).toBeNull();
  });
});

describe("calcularVeredito", () => {
  const tol = 100;
  it("OPTAR quando gera caixa sem negociar", () => {
    expect(calcularVeredito({ caixaSemNegociar: 101, caixaComRepasse: 0, repasseMin: null, tolerancia: tol })).toBe("OPTAR");
  });
  it("OPTAR quando gera caixa com repasse", () => {
    expect(calcularVeredito({ caixaSemNegociar: -500, caixaComRepasse: 101, repasseMin: 0.4, tolerancia: tol })).toBe("OPTAR");
  });
  it("LIMÍTROFE dentro da tolerância", () => {
    expect(calcularVeredito({ caixaSemNegociar: -500, caixaComRepasse: -100, repasseMin: 0.9, tolerancia: tol })).toBe("LIMITROFE");
  });
  it("NEGOCIAR quando repasse mínimo ≤ 100%", () => {
    expect(calcularVeredito({ caixaSemNegociar: -500, caixaComRepasse: -300, repasseMin: 1, tolerancia: tol })).toBe("NEGOCIAR");
  });
  it("MANTER nos demais casos", () => {
    expect(calcularVeredito({ caixaSemNegociar: -500, caixaComRepasse: -300, repasseMin: 1.2, tolerancia: tol })).toBe("MANTER");
    expect(calcularVeredito({ caixaSemNegociar: -500, caixaComRepasse: -300, repasseMin: null, tolerancia: tol })).toBe("MANTER");
  });
});

describe("faixaPorRbt12", () => {
  it("identifica a faixa pelo RBT12", () => {
    expect(faixaPorRbt12(180_000)).toBe(1);
    expect(faixaPorRbt12(180_000.01)).toBe(2);
    expect(faixaPorRbt12(4_000_000)).toBe(6);
  });
});

describe("regime de alíquota e reduções", () => {
  it("redução na saída reduz o débito e o crédito transferido ao cliente", () => {
    const r = simular({ empresa: { ...base, regimeSaida: "REDUCAO_60", reducaoSaida: 0.6 }, premissas: PREMISSAS_PADRAO });
    expect(r.ivaSaida).toBeCloseTo(0.265 * 0.4, 10); // 10,6%
    expect(r.ivaDeb).toBeCloseTo(50_000 * 0.106, 6);
    expect(r.credHib).toBeCloseTo(50_000 * 0.106, 6);
  });

  it("redução nas compras reduz o crédito das entradas", () => {
    const r = simular({ empresa: { ...base, reducaoCompras: 0.55 }, premissas: PREMISSAS_PADRAO });
    expect(r.ivaCompra).toBeCloseTo(0.265 * 0.45, 10);
    expect(r.ivaCred).toBeCloseTo(30_000 * 0.265 * 0.45, 6);
  });

  it("alíquota zero na saída: sem débito nem crédito ao cliente no Híbrido", () => {
    const r = simular({ empresa: { ...base, regimeSaida: "ALIQUOTA_ZERO", reducaoSaida: 1 }, premissas: PREMISSAS_PADRAO });
    expect(r.ivaDeb).toBe(0);
    expect(r.credHib).toBe(0);
  });

  it("as reduções mudam o resultado e podem mudar o veredito", () => {
    const cheio = simular({ empresa: base, premissas: PREMISSAS_PADRAO });
    // Vende com redução de 60%, mas compra com alíquota cheia: débito cai mais que o crédito
    const r60 = simular({ empresa: { ...base, reducaoSaida: 0.6 }, premissas: PREMISSAS_PADRAO });
    expect(r60.custoHib).toBeLessThan(cheio.custoHib);
    expect(r60.ganhoCliente).toBeLessThan(cheio.ganhoCliente);
    // Vende com alíquota cheia, mas as compras vêm com alíquota zero: sem crédito na entrada
    const semCredito = simular({ empresa: { ...base, pctB2B: 0.3, reducaoCompras: 1 }, premissas: PREMISSAS_PADRAO });
    expect(semCredito.ivaCred).toBe(0);
    expect(semCredito.veredito).toBe("MANTER");
  });

  it("identifica o regime pela redução", () => {
    expect(regimePorReducao(0)).toBe("PADRAO");
    expect(regimePorReducao(0.3)).toBe("REDUCAO_30");
    expect(regimePorReducao(0.6)).toBe("REDUCAO_60");
    expect(regimePorReducao(1)).toBe("ALIQUOTA_ZERO");
    expect(regimePorReducao(0.55)).toBe("PERSONALIZADO");
  });
});

describe("substituição tributária (ICMS-ST)", () => {
  const p2027 = { ...PREMISSAS_PADRAO, horizonte: "2027" as const };

  it("2027, Anexo I: tira a parcela do ICMS do DAS na receita com ST, nos dois cenários", () => {
    const sem = simular({ empresa: base, premissas: p2027 });
    const com = simular({ empresa: { ...base, pctSubstituicaoTributaria: 0.5 }, premissas: p2027 });
    // 50% de 50.000 × 7,19% × 33,5% (ICMS na 3ª faixa do Anexo I)
    const esperado = 25_000 * 0.0719 * 0.335;
    expect(com.stAplicada).toBe(true);
    expect(com.reducaoDasST).toBeCloseTo(esperado, 6);
    expect(com.dasPuro).toBeCloseTo(sem.dasPuro - esperado, 6);
    expect(com.dasHib).toBeCloseTo(sem.dasHib - esperado, 6);
  });

  it("não muda a comparação nem o veredito (ICMS fica no DAS nos dois regimes em 2027)", () => {
    const sem = simular({ empresa: base, premissas: p2027 });
    const com = simular({ empresa: { ...base, pctSubstituicaoTributaria: 1 }, premissas: p2027 });
    expect(com.deltaCusto).toBeCloseTo(sem.deltaCusto, 6);
    expect(com.veredito).toBe(sem.veredito);
  });

  it("não se aplica no IVA pleno (ICMS extinto) nem em anexos de serviço (ISS)", () => {
    const pleno = simular({ empresa: { ...base, pctSubstituicaoTributaria: 1 }, premissas: PREMISSAS_PADRAO });
    expect(pleno.stAplicada).toBe(false);
    expect(pleno.reducaoDasST).toBe(0);
    const servico = simular({ empresa: { ...base, anexo: "III", pctSubstituicaoTributaria: 1 }, premissas: p2027 });
    expect(servico.stAplicada).toBe(false);
  });

  it("Anexo II (indústria) usa a parcela do ICMS do anexo", () => {
    const r = simular({ empresa: { ...base, anexo: "II", faixa: 3, pctSubstituicaoTributaria: 1 }, premissas: p2027 });
    expect(r.reducaoDasST).toBeCloseTo(50_000 * r.aliqEf * 0.32, 6);
  });
});
