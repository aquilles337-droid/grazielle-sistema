"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { criarContaAssinante } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

export function SignupForm({ destino }: { destino: string }) {
  const [state, action, pending] = useActionState(criarContaAssinante, null);
  const senhaRef = useRef("");
  const [entrando, setEntrando] = useState(false);
  const [erroLogin, setErroLogin] = useState<string | null>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  // Conta criada: entra automaticamente e segue para o pagamento
  useEffect(() => {
    if (!state?.ok || !state.data) return;
    setEntrando(true);
    signIn("credentials", { email: state.data.email, senha: senhaRef.current, redirect: false }).then((res) => {
      if (res?.ok && !res.error) window.location.href = destino;
      else {
        setEntrando(false);
        setErroLogin("Conta criada! Entre com seu e-mail e senha para concluir a assinatura.");
      }
    });
  }, [state, destino]);

  if (erroLogin) {
    return (
      <div className="grid gap-3">
        <p className="text-sm">{erroLogin}</p>
        <Button asChild>
          <Link href={`/login?callbackUrl=${encodeURIComponent(destino)}`}>Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        // Envio manual: mantém os campos preenchidos se houver erro de validação
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" name="nome" autoComplete="name" required />
        <FieldError errors={fe?.nome} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
          <FieldError errors={fe?.email} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="telefone">WhatsApp</Label>
          <Input id="telefone" name="telefone" type="tel" placeholder="(82) 99999-9999" autoComplete="tel" required />
          <FieldError errors={fe?.telefone} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="crc">CRC</Label>
          <Input id="crc" name="crc" placeholder="AL-012345/O" required />
          <FieldError errors={fe?.crc} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="escritorio">Escritório (aparece no PDF)</Label>
          <Input id="escritorio" name="escritorio" placeholder="Opcional" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="senha">Crie uma senha</Label>
          <Input
            id="senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            onChange={(e) => (senhaRef.current = e.target.value)}
          />
          <FieldError errors={fe?.senha} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmacao">Confirme a senha</Label>
          <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" required />
          <FieldError errors={fe?.confirmacao} />
        </div>
      </div>

      {state && !state.ok && !fe && (
        <p className="text-sm text-destructive">
          {state.error}{" "}
          {state.error.includes("Já existe") && (
            <Link href={`/login?callbackUrl=${encodeURIComponent(destino)}`} className="font-medium underline">
              Entrar
            </Link>
          )}
        </p>
      )}

      <Button type="submit" size="lg" variant="accent" disabled={pending || entrando}>
        {pending || entrando ? <Loader2 className="animate-spin" /> : null}
        Continuar para o pagamento <ArrowRight />
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Ao continuar você concorda que a ferramenta é de apoio e não substitui a análise profissional.
      </p>
    </form>
  );
}
