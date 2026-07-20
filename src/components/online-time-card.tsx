import { formatarTempoOnline, type TempoOnline } from "@/lib/online-time";

/**
 * Tempo online do atendente na barra lateral: hoje, semana e mês. Começou a
 * ser medido quando o registro de sessões foi ligado — antes disso não há dado,
 * então os primeiros dias vêm parciais.
 */
export function OnlineTimeCard({ tempo }: { tempo: TempoOnline }) {
  const linhas: [string, number][] = [
    ["Hoje", tempo.hoje],
    ["Esta semana", tempo.semana],
    ["Este mês", tempo.mes],
  ];

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Tempo online
      </p>
      <div className="space-y-1.5">
        {linhas.map(([label, seg]) => (
          <div key={label} className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-secondary">{label}</span>
            <span className="font-mono text-sm font-semibold text-primary">
              {formatarTempoOnline(seg)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
