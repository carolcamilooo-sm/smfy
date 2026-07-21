"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresh da página (router.refresh) com teto de frequência.
 *
 * O tempo-real do painel vem do Pusher: cada lead novo, atribuído ou atendido
 * dispara um evento, e o admin escuta todos, de todos os operadores. Em hora de
 * pico chega mais de um por segundo, e sem freio cada um re-roda TODAS as
 * queries da página — a tela trava e as conexões do banco estouram.
 *
 * Aqui a primeira chamada atualiza na hora (continua parecendo instantâneo), e
 * as seguintes dentro da janela colapsam num único refresh no fim dela. Uma
 * rajada de 30 leads em 5s vira 1 ou 2 refreshes em vez de 30.
 */
export function useThrottledRefresh(minIntervalMs = 8000) {
  const router = useRouter();
  const ultimoRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(() => {
    const desde = Date.now() - ultimoRef.current;
    if (desde >= minIntervalMs) {
      ultimoRef.current = Date.now();
      router.refresh();
    } else if (!timerRef.current) {
      // Agenda um único refresh pro fim da janela — junta a rajada.
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        ultimoRef.current = Date.now();
        router.refresh();
      }, minIntervalMs - desde);
    }
  }, [router, minIntervalMs]);
}
