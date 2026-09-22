"use client";

import { useActionState, useEffect, useRef } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { changeOwnPassword } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, null);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="senhaAtual">Senha atual</Label>
        <Input id="senhaAtual" name="senhaAtual" type="password" autoComplete="current-password" required />
        <FieldError errors={fe?.senhaAtual} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="novaSenha">Nova senha</Label>
        <Input id="novaSenha" name="novaSenha" type="password" autoComplete="new-password" minLength={8} required />
        <FieldError errors={fe?.novaSenha} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmacao">Confirme a nova senha</Label>
        <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
        <FieldError errors={fe?.confirmacao} />
      </div>
      {state && !state.ok && !fe && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Alterar senha
      </Button>
    </form>
  );
}
