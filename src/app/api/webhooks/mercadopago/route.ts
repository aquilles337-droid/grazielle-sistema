import { MercadoPagoError, validarAssinaturaWebhook } from "@/lib/billing/mercadopago";
import { processarAuthorizedPayment, processarPagamentoMP, sincronizarPreapproval } from "@/lib/billing/processar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notificações do Mercado Pago (configurar em Suas integrações → Webhooks):
 *  - payment                          → Pix e cobranças do cartão
 *  - subscription_preapproval         → assinatura autorizada/pausada/cancelada
 *  - subscription_authorized_payment  → cada cobrança recorrente
 * Aceita o formato atual (body JSON + ?data.id=) e o IPN legado (?topic=&id=).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    // IPN legado não tem body
  }

  const tipo = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "";
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null) ?? url.searchParams.get("id");

  if (!validarAssinaturaWebhook(req.headers.get("x-signature"), req.headers.get("x-request-id"), dataId)) {
    return new Response("assinatura inválida", { status: 401 });
  }
  if (!dataId) return new Response("ok", { status: 200 });

  try {
    switch (tipo) {
      case "payment":
        await processarPagamentoMP(dataId);
        break;
      case "subscription_preapproval":
      case "preapproval":
        await sincronizarPreapproval(dataId);
        break;
      case "subscription_authorized_payment":
        await processarAuthorizedPayment(dataId);
        break;
      default:
        break; // outros tópicos são ignorados
    }
  } catch (e) {
    // Recurso inexistente (ex.: notificação de teste do painel): não adianta reenviar
    if (e instanceof MercadoPagoError && e.status === 404) return new Response("ok", { status: 200 });
    console.error("[webhook mercadopago]", tipo, dataId, e);
    // 500 faz o Mercado Pago reenviar a notificação depois
    return new Response("erro", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}

export function GET() {
  return new Response("ok", { status: 200 });
}
