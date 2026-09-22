"use client";

import { useTransition } from "react";
import { KeyRound, Power } from "lucide-react";
import { resetAccountantPassword, setAccountantActive } from "@/actions/admin";
import { Button } from "@/components/ui/button";

export function AccountantActions({ id, ativo }: { id: string; ativo: boolean }) {
  const [pending, start] = useTransition();

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        title="Redefinir senha"
        onClick={() => {
          const nova = prompt("Nova senha (mínimo 8 caracteres):");
          if (!nova) return;
          start(async () => {
            const res = await resetAccountantPassword(id, nova);
            alert(res.ok ? res.message : res.error);
          });
        }}
      >
        <KeyRound />
      </Button>
      <Button
        variant={ativo ? "outline" : "accent"}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setAccountantActive(id, !ativo);
            if (!res.ok) alert(res.error);
          })
        }
      >
        <Power /> {ativo ? "Desativar" : "Ativar"}
      </Button>
    </div>
  );
}
