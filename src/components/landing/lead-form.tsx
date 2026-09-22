"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createLead } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

export function LeadForm() {
  const [state, action, pending] = useActionState(createLead, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-accent" />
        <p className="text-lg font-semibold">Solicitação enviada!</p>
        <p className="max-w-sm text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4" noValidate>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid gap-2">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" name="nome" placeholder="Maria Silva" autoComplete="name" required />
        <FieldError errors={fe?.nome} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail profissional</Label>
        <Input id="email" name="email" type="email" placeholder="maria@escritorio.com.br" autoComplete="email" required />
        <FieldError errors={fe?.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="telefone">WhatsApp</Label>
          <Input id="telefone" name="telefone" type="tel" placeholder="(11) 99999-9999" autoComplete="tel" required />
          <FieldError errors={fe?.telefone} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="crc">CRC</Label>
          <Input id="crc" name="crc" placeholder="SP-123456/O-7" required />
          <FieldError errors={fe?.crc} />
        </div>
      </div>

      {state && !state.ok && !fe && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" size="lg" variant="accent" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : null}
        Solicitar acesso / demonstração
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Sem spam. Seus dados são usados apenas para contato comercial.
      </p>
    </form>
  );
}
