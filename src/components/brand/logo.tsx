import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * Identidade visual — mesma linguagem da logo da Logon Contabilidade:
 * arco grafite, barras ascendentes em degradê (a "régua") e duas faixas petróleo
 * representando os dois regimes comparados (Simples puro × Híbrido).
 */

export const DESENVOLVEDORA = "Logon Contabilidade";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-9 w-9", className)} role="img" aria-label="Régua do Híbrido">
      <defs>
        <linearGradient id="rh-grafite" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a8a8a" />
          <stop offset=".4" stopColor="#2e2e2e" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id="rh-petroleo" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#03485c" />
          <stop offset=".55" stopColor="#066782" />
          <stop offset="1" stopColor="#0b86a6" />
        </linearGradient>
      </defs>
      <path d="M38.5 8.6 A24.5 24.5 0 1 0 16.5 53" fill="none" stroke="url(#rh-grafite)" strokeWidth="4.4" />
      <path d="M20.5 43 V32.5 L25.1 30 V43 Z" fill="url(#rh-grafite)" />
      <path d="M28.1 43 V26 L32.7 23.5 V41.5 Z" fill="url(#rh-grafite)" />
      <path d="M35.7 40.5 V19.5 L40.3 17 V38 Z" fill="url(#rh-grafite)" />
      <path d="M43.3 36.5 V12 L47.9 9.5 V33 Z" fill="url(#rh-grafite)" />
      <path d="M10 58.5 C31 64 52 51 57 26 C55 40 44 53.5 20 55.8 C16.5 56.2 13 57 10 58.5 Z" fill="url(#rh-petroleo)" />
      <path d="M19 51 C33 51.5 46 43.5 52.5 28.5 C51 38 42 46.5 26 48.8 C23.5 49.2 21 49.9 19 51 Z" fill="url(#rh-petroleo)" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("leading-none", compact && "hidden sm:block")}>
        <span className="block text-[1.05rem] font-extrabold leading-tight tracking-tight text-foreground">Régua</span>
        <span className="mt-0.5 block text-[0.66rem] font-semibold uppercase leading-none tracking-[0.18em] text-accent">
          do Híbrido
        </span>
      </span>
    </span>
  );
}

/** Assinatura "Desenvolvido por" com a logo da Logon Contabilidade. */
export function DesenvolvidoPor({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}>
      Desenvolvido por
      <Image src="/logon-contabilidade.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
      <span className="font-semibold text-foreground">{DESENVOLVEDORA}</span>
    </span>
  );
}

/** Faixas petróleo decorativas (mesmo desenho da logo), para fundos de seção. */
export function FaixasDecorativas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 400" className={cn("pointer-events-none select-none", className)} aria-hidden fill="none">
      <defs>
        <linearGradient id="rh-faixa" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#03485c" />
          <stop offset=".55" stopColor="#066782" />
          <stop offset="1" stopColor="#0b86a6" />
        </linearGradient>
      </defs>
      <path d="M0 390 C200 420 470 330 560 60 C545 210 420 350 150 368 C95 372 45 378 0 390 Z" fill="url(#rh-faixa)" />
      <path d="M80 330 C260 338 440 250 520 90 C500 190 400 290 200 310 C160 314 115 320 80 330 Z" fill="url(#rh-faixa)" opacity=".75" />
    </svg>
  );
}
