import { describe, expect, it } from "vitest";
import { PREMISSAS_PADRAO, aliquotaEfetiva, calcularVeredito, simular, type DadosEmpresa } from "./motor";
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
    expect(r.iva).toBeCloseTo(0.0931, 6);
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
