"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { cancelarAssinatura } from "@/actions/billing";
import { Button } from "@/components/ui/button";

export function CancelarAssinaturaButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancelar a renovação automática? Seu acesso continua até o fim do período já pago.")) return;
        start(async () => {
          const res = await cancelarAssinatura(id);
          alert(res.ok ? res.message : res.error);
          router.refresh();
        });
      }}
    >
      <XCircle /> Cancelar assinatura
    </Button>
  );
}
