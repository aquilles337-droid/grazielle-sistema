import { describe, expect, it } from "vitest";
import { addMeses, calcularNovoAcesso, diasRestantes, precoPlano, temAcesso } from "./planos";

const d = (s: string) => new Date(s);

describe("preços", () => {
  it("cartão e Pix, mensal e anual", () => {
    expect(precoPlano("MENSAL", "CARTAO")).toBe(23.9);
    expect(precoPlano("ANUAL", "CARTAO")).toBe(239.9);
    expect(precoPlano("MENSAL", "PIX")).toBe(21.9);
    expect(precoPlano("ANUAL", "PIX")).toBe(219.9);
  });
});

describe("addMeses", () => {
  it("não estoura o fim do mês", () => {
    expect(addMeses(d("2026-01-31T12:00:00Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z");
    expect(addMeses(d("2028-01-31T12:00:00Z"), 1).toISOString()).toBe("2028-02-29T12:00:00.000Z");
    expect(addMeses(d("2026-09-23T10:00:00Z"), 12).toISOString()).toBe("2027-09-23T10:00:00.000Z");
  });
});

describe("calcularNovoAcesso", () => {
  const agora = d("2026-09-23T10:00:00Z");

  it("Pix mensal sem acesso: 30 dias a partir de agora", () => {
    const r = calcularNovoAcesso(null, agora, "MENSAL", "PIX");
    expect(r.de).toEqual(agora);
    expect(r.ate.toISOString()).toBe("2026-10-23T10:00:00.000Z");
  });

  it("Pix anual: 365 dias", () => {
    expect(calcularNovoAcesso(null, agora, "ANUAL", "PIX").ate.toISOString()).toBe("2027-09-23T10:00:00.000Z");
  });

  it("renovação antecipada soma ao vencimento atual", () => {
    const atual = d("2026-09-28T10:00:00Z");
    expect(calcularNovoAcesso(atual, agora, "MENSAL", "PIX").ate.toISOString()).toBe("2026-10-28T10:00:00.000Z");
  });

  it("acesso vencido recomeça de agora", () => {
    const vencido = d("2026-09-01T10:00:00Z");
    expect(calcularNovoAcesso(vencido, agora, "MENSAL", "PIX").de).toEqual(agora);
  });

  it("cartão usa meses de calendário", () => {
    expect(calcularNovoAcesso(null, agora, "MENSAL", "CARTAO").ate.toISOString()).toBe("2026-10-23T10:00:00.000Z");
    expect(calcularNovoAcesso(null, agora, "ANUAL", "CARTAO").ate.toISOString()).toBe("2027-09-23T10:00:00.000Z");
  });
});

describe("temAcesso", () => {
  const agora = d("2026-09-23T10:00:00Z");
  it("admin sempre tem acesso", () => {
    expect(temAcesso({ role: "ADMIN", acessoAte: null }, agora)).toBe(true);
  });
  it("contador sem pagamento não tem acesso", () => {
    expect(temAcesso({ role: "ACCOUNTANT", acessoAte: null }, agora)).toBe(false);
  });
  it("respeita o vencimento", () => {
    expect(temAcesso({ role: "ACCOUNTANT", acessoAte: d("2026-09-24T00:00:00Z") }, agora)).toBe(true);
    expect(temAcesso({ role: "ACCOUNTANT", acessoAte: d("2026-09-22T00:00:00Z") }, agora)).toBe(false);
  });
  it("cartão ativo tem 3 dias de carência", () => {
    const venceu = { role: "ACCOUNTANT", acessoAte: d("2026-09-21T12:00:00Z") };
    expect(temAcesso(venceu, agora, true)).toBe(true);
    expect(temAcesso(venceu, d("2026-09-25T00:00:00Z"), true)).toBe(false);
  });
});

describe("diasRestantes", () => {
  it("arredonda para cima", () => {
    expect(diasRestantes(d("2026-09-25T09:00:00Z"), d("2026-09-23T10:00:00Z"))).toBe(2);
    expect(diasRestantes(null, new Date())).toBeNull();
  });
});
