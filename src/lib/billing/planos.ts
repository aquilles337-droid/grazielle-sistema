/**
 * Planos, preços e regras de acesso da assinatura.
 * Funções puras (sem banco/rede) — usadas no client, no servidor e nos testes.
 */

export type PlanoTipo = "MENSAL" | "ANUAL";
export type MetodoTipo = "CARTAO" | "PIX";

export const PLANOS: Record<
  PlanoTipo,
  { nome: string; precos: Record<MetodoTipo, number>; diasPix: number; mesesCartao: number }
> = {
  MENSAL: { nome: "Mensal", precos: { CARTAO: 23.9, PIX: 21.9 }, diasPix: 30, mesesCartao: 1 },
  ANUAL: { nome: "Anual", precos: { CARTAO: 239.9, PIX: 219.9 }, diasPix: 365, mesesCartao: 12 },
};

export const METODOS: Record<MetodoTipo, string> = {
  CARTAO: "Cartão de crédito (recorrente)",
  PIX: "Pix",
};

/** Teste grátis no cartão: cartão cadastrado no checkout, 1ª cobrança após N dias. */
export const TRIAL_DIAS = 3;

/** Tolerância após o vencimento para quem tem assinatura ativa no cartão (retentativas de cobrança). */
export const CARENCIA_CARTAO_DIAS = 3;

/** Aviso de renovação exibido a partir de N dias antes do vencimento. */
export const AVISO_RENOVACAO_DIAS = 5;

const DIA_MS = 24 * 60 * 60 * 1000;

export const precoPlano = (plano: PlanoTipo, metodo: MetodoTipo) => PLANOS[plano].precos[metodo];

/** Soma meses de calendário sem "estourar" o mês (31/jan + 1 mês = 28/29 fev). */
export function addMeses(data: Date, meses: number): Date {
  const d = new Date(data);
  const dia = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(dia, ultimoDia));
  return d;
}

/**
 * Novo vencimento após um pagamento aprovado.
 * Soma a partir do vencimento atual se ainda estiver vigente (renovação antecipada
 * não perde dias); senão, a partir de agora.
 *  - Pix: 30 ou 365 dias corridos
 *  - Cartão recorrente: 1 ou 12 meses de calendário (acompanha a data de cobrança)
 */
export function calcularNovoAcesso(
  acessoAtual: Date | null | undefined,
  agora: Date,
  plano: PlanoTipo,
  metodo: MetodoTipo,
): { de: Date; ate: Date } {
  const de = acessoAtual && acessoAtual > agora ? acessoAtual : agora;
  const ate =
    metodo === "PIX"
      ? new Date(de.getTime() + PLANOS[plano].diasPix * DIA_MS)
      : addMeses(de, PLANOS[plano].mesesCartao);
  return { de, ate };
}

export function temAcesso(
  user: { role: string; acessoAte: Date | null },
  agora: Date,
  assinaturaCartaoAtiva = false,
): boolean {
  if (user.role === "ADMIN") return true;
  if (!user.acessoAte) return false;
  const limite = assinaturaCartaoAtiva
    ? new Date(user.acessoAte.getTime() + CARENCIA_CARTAO_DIAS * DIA_MS)
    : user.acessoAte;
  return limite > agora;
}

/** Dias restantes (arredondado para cima); negativo se já venceu; null se nunca teve acesso. */
export function diasRestantes(acessoAte: Date | null, agora: Date): number | null {
  if (!acessoAte) return null;
  return Math.ceil((acessoAte.getTime() - agora.getTime()) / DIA_MS);
}
