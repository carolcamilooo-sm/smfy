import Link from "next/link";
import { auth } from "@/auth";
import { getSalesRanking } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  const { period } = await searchParams;
  const { range, ranking } = await getSalesRanking({ period });

  const top5 = ranking.slice(0, 5);
  const myIndex = ranking.findIndex((r) => r.operatorId === session!.user.id);
  const myPosition = myIndex + 1;
  const myEntry = myIndex >= 0 ? ranking[myIndex] : null;
  const iAmInTop5 = myIndex >= 0 && myIndex < 5;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Ranking</h1>
        <p className="text-sm text-secondary">
          Top 5 em vendas convertidas (contadas pelo seu webhook pessoal em
          Ajustes).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <Link
            key={p.value}
            href={`?period=${p.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
              range.period === p.value
                ? "bg-accent text-app"
                : "border border-border bg-surface text-secondary hover:text-primary"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-secondary">Top 5</h2>
        <div className="space-y-2">
          {top5.map((entry, i) => {
            const isMe = entry.operatorId === session!.user.id;
            return (
              <div
                key={entry.operatorId}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg border px-4 py-3",
                  isMe ? "border-accent bg-accent/10" : "border-border bg-app"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-lg">{MEDALS[i] ?? `${i + 1}º`}</span>
                  <span className="text-sm font-semibold text-primary">
                    {entry.name}
                    {isMe && <span className="ml-1.5 text-xs text-accent">(você)</span>}
                  </span>
                </div>
                <span className="font-mono text-sm font-semibold text-accent">
                  {entry.count} venda(s)
                </span>
              </div>
            );
          })}
          {top5.length === 0 && (
            <p className="text-sm text-secondary">
              Ninguém registrou venda nesse período ainda.
            </p>
          )}
        </div>
      </Card>

      {!iAmInTop5 && myEntry && (
        <Card>
          <p className="text-sm text-secondary">
            Sua posição:{" "}
            <span className="font-mono font-semibold text-primary">{myPosition}º</span>{" "}
            lugar
          </p>
        </Card>
      )}
    </div>
  );
}
