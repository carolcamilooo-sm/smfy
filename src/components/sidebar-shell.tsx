"use client";

import { MouseEvent, ReactNode, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

/**
 * A barra lateral: fixa no desktop, gaveta no celular.
 *
 * No celular ela ocuparia 240px dos ~390px da tela, deixando o conteúdo
 * espremido — então vira uma gaveta que desliza sobre a página, com um cabeçalho
 * de 56px no topo pra abri-la.
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState(false);

  /**
   * Fecha ao tocar num link do menu. É por evento e não por efeito reagindo à
   * rota: o layout não remonta ao navegar, então sem isto a gaveta seguiria
   * aberta por cima da tela nova.
   */
  function onClickConteudo(e: MouseEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest("a")) setAberta(false);
  }

  // Trava o scroll do fundo enquanto a gaveta está aberta.
  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberta]);

  // Esc fecha, como em qualquer diálogo.
  useEffect(() => {
    if (!aberta) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [aberta]);

  return (
    <>
      {/* Cabeçalho só do celular: abre a gaveta e mantém a marca à vista. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-app px-4 md:hidden">
        <button
          type="button"
          onClick={() => setAberta(true)}
          aria-label="Abrir menu"
          aria-expanded={aberta}
          className="-ml-2 rounded-lg p-2 text-secondary hover:text-primary"
        >
          <Menu size={22} />
        </button>
        <Logo className="h-7" />
      </header>

      {/* Escurece e captura o toque fora da gaveta. */}
      {aberta && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setAberta(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      <aside
        onClick={onClickConteudo}
        className={
          "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-app p-4 transition-transform duration-200 " +
          // No desktop volta a ser o que sempre foi: uma coluna sticky no fluxo.
          "md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0 " +
          (aberta ? "translate-x-0" : "-translate-x-full md:translate-x-0")
        }
      >
        <button
          type="button"
          onClick={() => setAberta(false)}
          aria-label="Fechar menu"
          className="absolute right-3 top-3 rounded-lg p-1.5 text-secondary hover:text-primary md:hidden"
        >
          <X size={18} />
        </button>
        {children}
      </aside>
    </>
  );
}
