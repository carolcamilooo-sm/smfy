"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_COOKIE, type Theme } from "@/lib/theme-shared";

/**
 * Alterna o tema do painel.
 *
 * O tema mora num cookie e quem o aplica é o servidor, renderizando
 * data-theme no container do painel (ver os layouts). Isso evita o caminho
 * mais óbvio — script inline + data-theme no <html> —, que não funciona aqui:
 * o React reconcilia o <html> na hidratação e apaga o atributo que o script
 * tinha acabado de escrever, revertendo o tema a cada recarregamento.
 * suppressHydrationWarning silencia o aviso, mas não impede a remoção.
 *
 * O clique escreve o cookie e já vira o atributo na hora, sem esperar o
 * servidor: a resposta é imediata e o cookie só serve pro próximo
 * carregamento, que aí vem pintado de origem.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.querySelector<HTMLElement>("[data-theme-root]");
    if (!root) return;

    const atual: Theme = root.dataset.theme === "light" ? "light" : "dark";
    const proximo: Theme = atual === "light" ? "dark" : "light";

    root.dataset.theme = proximo;
    // 1 ano; SameSite=Lax porque só precisa valer na navegação do próprio app.
    document.cookie = `${THEME_COOKIE}=${proximo}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title="Alternar entre tema claro e escuro"
      aria-label="Alternar entre tema claro e escuro"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface p-2.5 text-xs font-semibold text-secondary hover:border-accent/50 hover:text-primary"
    >
      {/* Os dois rótulos vão no HTML e o CSS mostra o certo — assim o botão não
          depende de saber o tema no React, e o markup é o mesmo nos dois. */}
      <span className="theme-when-dark flex items-center gap-2">
        <Sun size={14} /> Tema claro
      </span>
      <span className="theme-when-light flex items-center gap-2">
        <Moon size={14} /> Tema escuro
      </span>
    </button>
  );
}
