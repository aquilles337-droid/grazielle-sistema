"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { createAccountant } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

export function AccountantForm() {
  const [state, action, pending] = useActionState(createAccountant, null);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required />
        <FieldError errors={fe?.nome} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail (login)</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError errors={fe?.email} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="senha">Senha inicial</Label>
        <Input id="senha" name="senha" type="text" minLength={8} autoComplete="new-password" required />
        <FieldError errors={fe?.senha} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="escritorio">Escritório</Label>
          <Input id="escritorio" name="escritorio" placeholder="Exibido no PDF" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="crc">CRC</Label>
          <Input id="crc" name="crc" />
        </div>
      </div>
      {state && !state.ok && !fe && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        Criar acesso
      </Button>
    </form>
  );
}
