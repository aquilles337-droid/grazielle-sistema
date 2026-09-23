import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/*
 * Cliente mínimo da API do Mercado Pago (REST via fetch).
 *  - Pix:     POST /v1/payments (payment_method_id = "pix")
 *  - Cartão:  POST /preapproval (assinatura sem plano, status "pending") → init_point
 *  - Consultas usadas pelo webhook e pela sincronização.
 * MP_API_URL existe só para testes locais com um servidor simulado.
 */

const API = process.env.MP_API_URL || "https://api.mercadopago.com";

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

export function mpConfigurado() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

async function mp<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new MercadoPagoError("MP_ACCESS_TOKEN não configurado", 500, null);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.method && init.method !== "GET") headers["X-Idempotency-Key"] = init.idempotencyKey ?? randomUUID();

  const res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    console.error("[mercadopago]", init.method ?? "GET", path, res.status, text.slice(0, 500));
    throw new MercadoPagoError(`Mercado Pago respondeu ${res.status}`, res.status, body);
  }
  return body as T;
}

/** URL pública do app (necessária para webhook e retorno do checkout). */
export function appUrl() {
  return (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** O Mercado Pago só aceita notification_url/back_url públicas em https. */
const urlPublica = (path: string) => {
  const base = appUrl();
  return base.startsWith("https://") ? `${base}${path}` : undefined;
};

// ---------- Tipos (apenas os campos usados) ----------

export interface MpPayment {
  id: number;
  status: string; // pending | approved | authorized | in_process | in_mediation | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  transaction_amount: number;
  external_reference?: string | null;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  metadata?: Record<string, unknown>;
  point_of_interaction?: {
    type?: string;
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
      subscription_id?: string;
    };
  };
}

export interface MpPreapproval {
  id: string;
  status: string; // pending | authorized | paused | cancelled
  init_point?: string;
  external_reference?: string;
  payer_email?: string;
}

export interface MpAuthorizedPayment {
  id: string | number;
  preapproval_id?: string;
  status?: string;
  transaction_amount?: number;
  payment?: { id: string | number; status: string; status_detail?: string };
}

/** "2026-09-23T14:30:00.000-03:00" — formato de data com fuso usado pela API. */
export function formatarDataMp(d: Date) {
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().replace("Z", "-03:00");
}

// ---------- Operações ----------

export function criarPagamentoPix(params: {
  pagamentoId: string;
  valor: number;
  descricao: string;
  email: string;
  nome: string;
  expiraEm: Date;
}) {
  const [first_name, ...resto] = params.nome.trim().split(/\s+/);
  return mp<MpPayment>("/v1/payments", {
    method: "POST",
    idempotencyKey: `pix-${params.pagamentoId}`,
    body: JSON.stringify({
      transaction_amount: params.valor,
      description: params.descricao,
      payment_method_id: "pix",
      external_reference: params.pagamentoId,
      notification_url: urlPublica("/api/webhooks/mercadopago"),
      date_of_expiration: formatarDataMp(params.expiraEm),
      payer: { email: params.email, first_name, last_name: resto.join(" ") || undefined },
    }),
  });
}

export function criarAssinaturaCartao(params: {
  assinaturaId: string;
  valor: number;
  meses: number;
  descricao: string;
  emailPagador: string;
  trialDias?: number;
}) {
  return mp<MpPreapproval>("/preapproval", {
    method: "POST",
    idempotencyKey: `sub-${params.assinaturaId}`,
    body: JSON.stringify({
      reason: params.descricao,
      external_reference: params.assinaturaId,
      payer_email: params.emailPagador,
      back_url: urlPublica("/painel/assinatura?retorno=cartao") ?? "https://www.mercadopago.com.br",
      auto_recurring: {
        frequency: params.meses,
        frequency_type: "months",
        transaction_amount: params.valor,
        currency_id: "BRL",
        // Teste grátis: o cartão é validado agora e a 1ª cobrança ocorre após o período
        ...(params.trialDias ? { free_trial: { frequency: params.trialDias, frequency_type: "days" } } : {}),
      },
      status: "pending",
    }),
  });
}

export const buscarPagamento = (id: string | number) => mp<MpPayment>(`/v1/payments/${encodeURIComponent(String(id))}`);

export const buscarPreapproval = (id: string) => mp<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`);

export const cancelarPreapproval = (id: string) =>
  mp<MpPreapproval>(`/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });

export const buscarAuthorizedPayment = (id: string) =>
  mp<MpAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(id)}`);

export const listarAuthorizedPayments = (preapprovalId: string) =>
  mp<{ results?: MpAuthorizedPayment[] }>(
    `/authorized_payments/search?preapproval_id=${encodeURIComponent(preapprovalId)}`,
  );

// ---------- Webhook ----------

/**
 * Valida o header x-signature ("ts=...,v1=...") do webhook.
 * Manifest oficial: "id:{data.id};request-id:{x-request-id};ts:{ts};" → HMAC-SHA256 com a
 * "assinatura secreta" do painel de Webhooks. Retorna true se não houver segredo configurado
 * (o conteúdo do webhook é sempre reconsultado na API, então o risco é só de carga).
 */
export function validarAssinaturaWebhook(xSignature: string | null, xRequestId: string | null, dataId: string | null) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!xSignature) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  // A documentação pede o data.id em minúsculas quando alfanumérico
  const ids = dataId ? [...new Set([dataId, dataId.toLowerCase()])] : [null];
  return ids.some((id) => {
    const manifest = [id ? `id:${id}` : null, xRequestId ? `request-id:${xRequestId}` : null, `ts:${ts}`]
      .filter(Boolean)
      .join(";")
      .concat(";");
    const esperado = createHmac("sha256", secret).update(manifest).digest("hex");
    return esperado.length === v1.length && timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  });
}
