import Link from "next/link";
import { auth } from "@/auth";
import { getOperatorPerformance } from "@/lib/queries";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" },
];

function formatSeconds(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min ${String(seconds % 60).padStart(2, "0")}s`;
}

export default async function MeuDesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const { period } = await searchParams;
  const data = await getOperatorPerformance(session!.user.id, { period: period ?? "week" });

  const maxDaily = Math.max(1, ...data.dailySeries.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Meu desempenho</h1>
        <p className="text-sm text-secondary">Como você está performando nesse período.</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`?period=${p.key}`}
            className={
              data.range.period === p.key
                ? "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-app"
                : "rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary"
            }
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-secondary">Leads atendidos</p>
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">{data.attended}</p>
          <p className="mt-1.5 text-xs text-secondary">
            {data.percentChange == null
              ? "sem período anterior pra comparar"
              : `${data.percentChange >= 0 ? "+" : ""}${data.percentChange}% vs período anterior`}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Vendas convertidas</p>
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">
            {data.convertedSales}
          </p>
          <p className="mt-1.5 text-xs text-secondary">{data.conversionRate}% de taxa de conversão</p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">1ª resposta média</p>
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">
            {formatSeconds(data.avgFirstResponseSeconds)}
          </p>
          <p className="mt-1.5 text-xs text-secondary">meta: {data.responseTargetSeconds}s</p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Posição no ranking</p>
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">
            #{data.rankPosition || "-"}
          </p>
          <p className="mt-1.5 text-xs text-secondary">de {data.totalOperators} operadores</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-title">Leads atendidos por dia</span>
            <span className="font-mono text-xs text-muted">últimos 7 dias</span>
          </div>
          <div className="flex h-36 items-end gap-3">
            {data.dailySeries.map((d) => (
              <div key={d.label} className="flex-1 rounded-t bg-accent/40" style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }} />
            ))}
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[11px] text-muted">
            {data.dailySeries.map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
          </div>
        </Card>

        <Card>
          <span className="mb-4 block text-sm font-semibold text-title">
            Ranking da equipe — semana
          </span>
          <div className="flex flex-col gap-2.5">
            {data.weeklyRanking.map((op, idx) => (
              <div
                key={op.id}
                className={
                  op.isMe
                    ? "flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5"
                    : "flex items-center justify-between px-3 py-2.5"
                }
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={
                      op.isMe
                        ? "flex h-5 w-5 items-center justify-center rounded-[5px] bg-accent text-[10px] font-bold text-app"
                        : "flex h-5 w-5 items-center justify-center rounded-[5px] bg-surface-raised text-[10px] font-bold text-secondary"
                    }
                  >
                    {idx + 1}
                  </span>
                  <span className={op.isMe ? "text-sm font-bold text-primary" : "text-sm text-secondary"}>
                    {op.isMe ? "Você" : op.name}
                  </span>
                </div>
                <span className="font-mono text-sm text-secondary">{op.attended}</span>
              </div>
            ))}
            {data.weeklyRanking.length === 0 && (
              <p className="text-sm text-secondary">Nenhum operador cadastrado ainda.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
