import Link from "next/link";
import { getSalesRanking } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANKING_PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
];

/** Ouro, prata, bronze pro pódio; o resto fica neutro. */
function corPosicao(i: number) {
  if (i === 0) return "text-warning";
  if (i === 1) return "text-secondary";
  if (i === 2) return "text-accent";
  return "text-muted";
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const { range, ranking } = await getSalesRanking({ period });

  const maior = ranking[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Ranking de vendas
        </h1>
        <p className="text-sm text-secondary">
          Vendas confirmadas por atendente. Vêm do webhook de vendas — o da
          empresa, que casa a venda com quem atendeu o lead, mais os webhooks
          pessoais que cada um configura em Ajustes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANKING_PERIODS.map((p) => (
          <Link
            key={p.value}
            href={`?period=${p.value}`}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
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
        <div className="space-y-1.5">
          {ranking.map((entry, i) => (
            <div
              key={entry.operatorId}
              className="flex items-center gap-3 rounded-lg border border-border bg-app px-4 py-2.5"
            >
              <span className={cn("w-7 shrink-0 font-mono text-sm font-bold", corPosicao(i))}>
                {i + 1}º
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-primary">{entry.name}</span>
              {/* Barra proporcional ao 1º lugar: dá a leitura de distância entre
                  quem lidera e o resto sem precisar fazer conta. */}
              <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-surface-raised sm:block">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${maior > 0 ? (entry.count / maior) * 100 : 0}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold text-accent">
                {entry.count}
              </span>
            </div>
          ))}
          {ranking.length === 0 && (
            <p className="text-sm text-secondary">Nenhum operador cadastrado ainda.</p>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted">
        O que o atendente vê no painel dele é o mesmo ranking, mas só o top 5 e a
        própria posição. Aqui você vê a lista inteira.
      </p>
    </div>
  );
}
