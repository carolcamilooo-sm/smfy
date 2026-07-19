"use client";

import { useEffect, useId, useRef, useState } from "react";

export type FilterOption = { value: string; label: string; count: number };

/**
 * Seleção guardada: "all" = sem filtro. A lista vazia também vale como "all" —
 * desmarcar tudo mostrando fila nenhuma seria um beco sem saída.
 */
export type Selection = string[] | "all";

/**
 * Grava no localStorage (que só guarda texto). Formato novo é JSON; o valor
 * antigo, de quando o filtro era de escolha única, era o nome cru — por isso a
 * leitura aceita os dois e ninguém perde a preferência salva.
 */
export function encodeSelection(sel: Selection): string {
  return sel === "all" || sel.length === 0 ? "all" : JSON.stringify(sel);
}

export function decodeSelection(raw: string): Selection {
  if (!raw || raw === "all") return "all";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const nomes = parsed.filter((v): v is string => typeof v === "string");
      return nomes.length > 0 ? nomes : "all";
    }
  } catch {
    // Não é JSON: é o formato antigo, um nome só.
  }
  return [raw];
}

/** Um lead passa se não há filtro ou se o valor dele está entre os marcados. */
export function matchesSelection(sel: Selection, value: string): boolean {
  return sel === "all" || sel.includes(value);
}

/**
 * Descarta o que não existe mais na fila. Se nada do que estava salvo sobrou,
 * volta pra "all" em vez de deixar o atendente olhando uma lista vazia — e a
 * preferência salva não é apagada, então quando aquele produtor voltar a
 * mandar lead o filtro volta a valer.
 */
export function effectiveSelection(sel: Selection, disponiveis: string[]): Selection {
  if (sel === "all") return "all";
  const restantes = sel.filter((v) => disponiveis.includes(v));
  return restantes.length > 0 ? restantes : "all";
}

export function MultiSelectFilter({
  label,
  options,
  selection,
  onChange,
  totalCount,
}: {
  label: string;
  options: FilterOption[];
  selection: Selection;
  onChange: (next: Selection) => void;
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const painelId = useId();

  // Fecha ao clicar fora ou apertar Esc. É assinatura de evento do documento,
  // não estado derivado — por isso vive num efeito.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const marcados = selection === "all" ? [] : selection;
  const contaVisivel =
    selection === "all"
      ? totalCount
      : options.reduce((sum, o) => (marcados.includes(o.value) ? sum + o.count : sum), 0);

  const resumo =
    selection === "all"
      ? "Todos"
      : marcados.length === 1
        ? (options.find((o) => o.value === marcados[0])?.label ?? marcados[0])
        : `${marcados.length} selecionados`;

  function alterna(value: string) {
    if (selection === "all") {
      // Vindo de "todos", marcar um item significa querer só ele.
      onChange([value]);
      return;
    }
    const next = marcados.includes(value)
      ? marcados.filter((v) => v !== value)
      : [...marcados, value];
    onChange(next.length === 0 ? "all" : next);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-secondary">{label}</span>
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={painelId}
          className="flex min-w-[9rem] items-center justify-between gap-2 rounded-md border border-border bg-app px-2.5 py-1.5 text-xs text-primary hover:border-accent focus:border-accent focus:outline-none"
        >
          <span className="truncate">
            {resumo} ({contaVisivel})
          </span>
          <span aria-hidden className="text-muted">
            ▾
          </span>
        </button>

        {open && (
          <div
            id={painelId}
            className="absolute right-0 z-20 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-lg"
          >
            <button
              type="button"
              onClick={() => onChange("all")}
              className={
                "mb-1 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-app " +
                (selection === "all" ? "text-accent" : "text-secondary")
              }
            >
              <span>Todos</span>
              <span className="font-mono text-muted">{totalCount}</span>
            </button>
            <div className="border-t border-border pt-1">
              {options.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-primary hover:bg-app"
                >
                  <input
                    type="checkbox"
                    checked={marcados.includes(o.value)}
                    onChange={() => alterna(o.value)}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  <span className="font-mono text-muted">{o.count}</span>
                </label>
              ))}
              {options.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted">Nada na fila.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
