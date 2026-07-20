"use client";

import { useRouter } from "next/navigation";

/**
 * Filtro de um dia específico. Escolher a data navega pra ?period=custom com
 * from=to=aquele dia — o resolveDateRange trata dia único como janela de horas.
 */
export function RankingDatePicker({
  value,
  atendente,
}: {
  value: string;
  atendente?: string;
}) {
  const router = useRouter();

  return (
    <input
      type="date"
      defaultValue={value}
      onChange={(e) => {
        const d = e.target.value;
        if (!d) return;
        const p = new URLSearchParams({ period: "custom", from: d, to: d });
        if (atendente) p.set("atendente", atendente);
        router.push(`?${p.toString()}`);
      }}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-secondary focus:border-accent focus:outline-none"
    />
  );
}
