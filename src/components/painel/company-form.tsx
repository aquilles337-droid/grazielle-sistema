"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Plus } from "lucide-react";
import { createCompany } from "@/actions/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

export function CompanyForm() {
  const [state, action, pending] = useActionState(createCompany, null);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="nome">Razão social</Label>
        <Input id="nome" name="nome" required />
        <FieldError errors={fe?.nome} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" name="cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" required />
        <FieldError errors={fe?.cnpj} />
      </div>
      {state && !state.ok && !fe && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />}
        Cadastrar
      </Button>
    </form>
  );
}
