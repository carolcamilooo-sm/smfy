"use client";

import { useEffect } from "react";

/**
 * Publica a posição do ponteiro em CSS vars no <html>, pra qualquer card dentro
 * de [data-glow-scope] reagir (o efeito em si mora no globals.css).
 *
 * É um listener só pra tela inteira, não um por card: o dashboard tem 10 cards
 * e o painel do atendente 4 — um listener por instância seria 14 handlers
 * disparando a cada movimento do mouse.
 *
 * Como as coordenadas são da viewport e o gradiente usa background-attachment:
 * fixed, cada card mostra só o pedaço do brilho que passa por cima dele — é o
 * que dá a sensação de uma luz única varrendo a página.
 */
export function SpotlightPointer() {
  useEffect(() => {
    // Sem ponteiro (celular/tablet) não há hover: não registra nada.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    const root = document.documentElement;

    function onMove(e: PointerEvent) {
      // Agrupa no rAF: pointermove dispara muito mais que o refresh da tela.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty("--glow-x", `${e.clientX}px`);
        root.style.setProperty("--glow-y", `${e.clientY}px`);
        // 0 → 1 conforme atravessa a tela; move o tom dentro do roxo da marca.
        root.style.setProperty("--glow-xp", (e.clientX / window.innerWidth).toFixed(3));
      });
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
