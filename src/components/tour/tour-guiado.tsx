"use client";

import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { TOURS, TOUR_EVENTO, TOUR_EXEMPLO_EVENTO, chaveTour, tourDaRota, type TourId } from "./tours";

const visivel = (el: Element | null): el is HTMLElement => {
  if (!el) return false;
  const r = (el as HTMLElement).getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

function montarPassos(tour: TourId): DriveStep[] {
  return TOURS[tour].flatMap((p) => {
    if (!p.alvo) return [{ popover: { title: p.titulo, description: p.texto } }];
    const el = document.querySelector(`[data-tour="${p.alvo}"]`);
    if (!visivel(el)) return []; // elemento não existe nesta tela/perfil/tamanho → pula
    return [{ element: el, popover: { title: p.titulo, description: p.texto, side: p.lado ?? "bottom", align: "start" } }];
  });
}

async function iniciar(tour: TourId) {
  if (tour === "simulador") {
    // Preenche um exemplo (só se o formulário estiver vazio) para os resultados aparecerem
    window.dispatchEvent(new Event(TOUR_EXEMPLO_EVENTO));
    await new Promise((r) => setTimeout(r, 350));
  }
  const steps = montarPassos(tour);
  if (steps.length === 0) return;
  driver({
    steps,
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Próximo →",
    prevBtnText: "← Voltar",
    doneBtnText: "Concluir",
    popoverClass: "rh-tour",
    overlayColor: "#0a0a0a",
    overlayOpacity: 0.62,
    stagePadding: 6,
    stageRadius: 10,
    smoothScroll: true,
    allowClose: true,
  }).drive();
}

/**
 * Apresentação guiada da tela atual. Abre sozinha na primeira visita de cada
 * usuário a cada tela (lembrado neste navegador) e pode ser repetida pelo botão
 * "Tutorial" do cabeçalho ou em Minha conta.
 */
export function TourGuiado({ userId }: { userId: string }) {
  const pathname = usePathname();
  const tour = tourDaRota(pathname);

  const rodar = useCallback(() => {
    if (tour) void iniciar(tour);
  }, [tour]);

  useEffect(() => {
    window.addEventListener(TOUR_EVENTO, rodar);
    return () => window.removeEventListener(TOUR_EVENTO, rodar);
  }, [rodar]);

  useEffect(() => {
    if (!tour) return;
    const chave = chaveTour(userId, tour);
    let visto = false;
    try {
      visto = localStorage.getItem(chave) === "1";
    } catch {
      return; // sem armazenamento local: não força a apresentação a cada visita
    }
    if (visto) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(chave, "1");
      } catch {}
      void iniciar(tour);
    }, 700);
    return () => clearTimeout(t);
  }, [tour, userId]);

  return null;
}

/** Botão "Tutorial" do cabeçalho — some nas telas sem apresentação. */
export function BotaoTutorial({ className, children }: { className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  if (!tourDaRota(pathname)) return null;
  return (
    <button
      type="button"
      data-tour="btn-tutorial"
      className={className}
      onClick={() => window.dispatchEvent(new Event(TOUR_EVENTO))}
    >
      {children}
    </button>
  );
}

/** Apaga o "já visto" de todas as telas e volta ao painel (a apresentação recomeça). */
export function reiniciarApresentacao(userId: string) {
  try {
    (Object.keys(TOURS) as TourId[]).forEach((t) => localStorage.removeItem(chaveTour(userId, t)));
  } catch {}
}
