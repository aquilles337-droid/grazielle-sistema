"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { enviarLogo, removerLogo, salvarDadosEscritorio } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shared/field-error";

export function DadosEscritorio({
  escritorio,
  crc,
  logoVersao,
}: {
  escritorio: string | null;
  crc: string | null;
  /** Timestamp da última troca de logo (null = sem logo). */
  logoVersao: number | null;
}) {
  const router = useRouter();
  const [state, action, salvando] = useActionState(salvarDadosEscritorio, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [msgLogo, setMsgLogo] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, start] = useTransition();

  const temLogo = logoVersao !== null;

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setMsgLogo(null);
    if (!f) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      setMsgLogo({ ok: false, texto: "Envie a logo em PNG ou JPG." });
      return;
    }
    if (f.size > 1024 * 1024) {
      setMsgLogo({ ok: false, texto: "A imagem deve ter no máximo 1 MB." });
      return;
    }
    setPrevia(URL.createObjectURL(f));
    const fd = new FormData();
    fd.append("logo", f);
    start(async () => {
      const res = await enviarLogo(fd);
      setMsgLogo({ ok: res.ok, texto: res.ok ? (res.message ?? "Logo salva.") : res.error });
      if (!res.ok) setPrevia(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  function remover() {
    if (!confirm("Remover a logo do escritório dos PDFs?")) return;
    start(async () => {
      const res = await removerLogo();
      setPrevia(null);
      setMsgLogo({ ok: res.ok, texto: res.ok ? (res.message ?? "Logo removida.") : res.error });
      router.refresh();
    });
  }

  const srcLogo = previa ?? (temLogo ? `/api/conta/logo?v=${logoVersao}` : null);

  return (
    <div className="grid gap-6">
      {/* Logo */}
      <div data-tour="conta-logo" className="grid gap-3">
        <Label>Logo do escritório</Label>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white p-2">
            {srcLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={srcLogo} alt="Logo do escritório" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-center text-xs text-muted-foreground">Sem logo</span>
            )}
          </div>
          <div className="grid gap-2">
            <input
              ref={inputRef}
              id="logo"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={escolher}
            />
            <Button type="button" variant="outline" size="sm" disabled={enviando} onClick={() => inputRef.current?.click()}>
              {enviando ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {temLogo ? "Trocar logo" : "Enviar logo"}
            </Button>
            {temLogo && (
              <Button type="button" variant="ghost" size="sm" disabled={enviando} onClick={remover}>
                <Trash2 className="text-destructive" /> Remover
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          PNG ou JPG, até 1 MB. Aparece no cabeçalho de todos os relatórios em PDF. Dica: use a versão horizontal da logo.
        </p>
        {msgLogo && <p className={msgLogo.ok ? "text-sm text-accent" : "text-sm text-destructive"}>{msgLogo.texto}</p>}
      </div>

      {/* Nome e CRC */}
      <form action={action} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="escritorio">Nome do escritório (no topo do PDF)</Label>
          <Input id="escritorio" name="escritorio" defaultValue={escritorio ?? ""} placeholder="Ex.: Silva Contabilidade" />
          <FieldError errors={fe?.escritorio} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="crc">CRC (no rodapé do PDF)</Label>
          <Input id="crc" name="crc" defaultValue={crc ?? ""} placeholder="AL-012345/O" />
          <FieldError errors={fe?.crc} />
        </div>
        {state && !state.ok && !fe && <p className="text-sm text-destructive">{state.error}</p>}
        {state?.ok && <p className="text-sm text-accent">{state.message}</p>}
        <Button type="submit" disabled={salvando} className="justify-self-start">
          {salvando ? <Loader2 className="animate-spin" /> : <Save />} Salvar dados
        </Button>
      </form>
    </div>
  );
}
