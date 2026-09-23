"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock } from "lucide-react";

/*
 * Formulário de cartão do Mercado Pago (Card Payment Brick) embutido na página.
 * Os campos do cartão são iframes seguros do Mercado Pago (PCI): o número do cartão
 * nunca passa pelo nosso servidor — recebemos só um token de uso único.
 */

type Brick = { unmount: () => void };
type MercadoPagoCtor = new (
  publicKey: string,
  options?: { locale?: string },
) => { bricks: () => { create: (tipo: string, containerId: string, settings: object) => Promise<Brick> } };

declare global {
  interface Window {
    MercadoPago?: MercadoPagoCtor;
  }
}

const SDK_URL = "https://sdk.mercadopago.com/js/v2";
let sdkPromise: Promise<void> | null = null;

function carregarSdk() {
  if (window.MercadoPago) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("Falha ao carregar o Mercado Pago"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export type DadosCartao = { token: string; docTipo?: string; docNumero?: string };

type FormDataBrick = { token: string; payer?: { identification?: { type?: string; number?: string } } };

export function CardBrick({
  publicKey,
  valor,
  email,
  textoBotao,
  onSubmit,
}: {
  publicKey: string;
  valor: number;
  email: string;
  textoBotao: string;
  onSubmit: (dados: DadosCartao) => Promise<void>;
}) {
  const containerId = "cardPaymentBrick_container";
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    let cancelado = false;
    let brick: Brick | undefined;
    setEstado("carregando");

    carregarSdk()
      .then(async () => {
        if (cancelado || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        brick = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount: valor, payer: { email } },
          customization: {
            // Assinatura recorrente exige cartão de crédito, à vista
            paymentMethods: { maxInstallments: 1, types: { excluded: ["debit_card", "prepaid_card"] } },
            visual: {
              texts: { formSubmit: textoBotao },
              hideFormTitle: true,
              // Cores da marca (petróleo) no formulário do Mercado Pago
              style: { customVariables: { baseColor: "#066782", buttonTextColor: "#ffffff" } },
            },
          },
          callbacks: {
            onReady: () => !cancelado && setEstado("pronto"),
            onError: (e: unknown) => console.error("[card brick]", e),
            onSubmit: (fd: FormDataBrick) =>
              onSubmitRef.current({
                token: fd.token,
                docTipo: fd.payer?.identification?.type,
                docNumero: fd.payer?.identification?.number,
              }),
          },
        });
        if (cancelado) brick.unmount();
      })
      .catch(() => !cancelado && setEstado("erro"));

    return () => {
      cancelado = true;
      brick?.unmount();
    };
  }, [publicKey, valor, email, textoBotao]);

  return (
    <div className="grid gap-2">
      {estado === "carregando" && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando formulário seguro…
        </div>
      )}
      {estado === "erro" && (
        <p className="py-6 text-center text-sm text-destructive">
          Não foi possível carregar o formulário de cartão. Verifique sua conexão e recarregue a página.
        </p>
      )}
      <div id={containerId} />
      <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Dados do cartão protegidos e processados pelo Mercado Pago
      </p>
    </div>
  );
}
