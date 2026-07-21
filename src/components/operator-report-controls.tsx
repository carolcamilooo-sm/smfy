"use client";

import { useRouter } from "next/navigation";
import { shiftDateString } from "@/lib/date-br";

/**
 * Troca o dia do relatório mantendo o atendente selecionado. Setas pra andar de
 * um dia e um seletor de data pra pular pra qualquer dia. Não deixa passar de
 * hoje — não existe relatório do futuro.
 */
export function OperatorReportControls({
  atendente,
  dia,
  hoje,
}: {
  atendente: string;
  dia: string;
  hoje: string;
}) {
  const router = useRouter();

  function irPara(novoDia: string) {
    if (novoDia > hoje) return;
    const p = new URLSearchParams({ atendente, dia: novoDia });
    router.push(`?${p.toString()}`);
  }

  const noFuturo = dia >= hoje;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => irPara(shiftDateString(dia, -1))}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-secondary hover:text-primary"
        aria-label="Dia anterior"
      >
        ‹
      </button>
      <input
        type="date"
        value={dia}
        max={hoje}
        onChange={(e) => e.target.value && irPara(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-secondary focus:border-accent focus:outline-none"
      />
      <button
        type="button"
        onClick={() => irPara(shiftDateString(dia, 1))}
        disabled={noFuturo}
        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-secondary hover:text-primary disabled:opacity-30"
        aria-label="Próximo dia"
      >
        ›
      </button>
    </div>
  );
}
