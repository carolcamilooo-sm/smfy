import Link from "next/link";
import { getSalesLeaderboard, getOperatorSales, type LeaderboardEntry } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BR_TIMEZONE } from "@/lib/date-br";
import { RankingDatePicker } from "@/components/ranking-date-picker";

export const dynamic = "force-dynamic";

const PERIODOS = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
];

const MEDALHA = ["🥇", "🥈", "🥉"];

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function horaBR(d: Date) {
  return new Date(d).toLocaleString("pt-BR", {
    timeZone: BR_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Preserva o período ao montar links (filtro, clique no nome). */
function comParams(base: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  return `?${p.toString()}`;
}

/** Cartão do pódio. O 1º vem destacado e mais alto. */
function PodiumCard({
  entry,
  posicao,
  href,
  destaque,
}: {
  entry: LeaderboardEntry;
  posicao: number;
  href: string;
  destaque: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center rounded-2xl border p-4 text-center transition-transform hover:-translate-y-0.5",
        destaque
          ? "border-accent bg-accent/15 shadow-lg shadow-accent/10"
          : "border-border bg-surface"
      )}
    >
      <span className="text-3xl leading-none">{MEDALHA[posicao - 1]}</span>
      <span className="mt-2 truncate text-sm font-bold text-primary">{entry.name}</span>
      <span className="text-[11px] text-muted">{entry.recebidos} leads recebidos</span>
      <span
        className={cn(
          "mt-1 font-mono text-lg font-bold",
          destaque ? "text-accent" : "text-success"
        )}
      >
        {brl(entry.receita)}
      </span>
      <span className="text-[11px] text-secondary">{entry.vendas} vendas · {entry.taxa}%</span>
    </Link>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string; atendente?: string }>;
}) {
  const { period, from, to, atendente } = await searchParams;

  const [{ range, entries }, vendasDoSelecionado] = await Promise.all([
    getSalesLeaderboard({ period, from, to }),
    atendente ? getOperatorSales(atendente, { period, from, to }) : Promise.resolve(null),
  ]);

  const periodoAtivo = from && to ? "custom" : range.period;
  const linkBase = { period: from && to ? undefined : range.period, from, to };

  const top3 = entries.filter((e) => e.vendas > 0 || e.recebidos > 0).slice(0, 3);
  // Pódio na ordem visual 2º · 1º · 3º.
  const ordemPodio = [top3[1], top3[0], top3[2]].filter(Boolean);

  const melhorTaxa = [...entries].sort((a, b) => b.taxa - a.taxa)[0];
  const maiorReceita = [...entries].sort((a, b) => b.receita - a.receita)[0];
  const comRecebidos = entries.filter((e) => e.recebidos > 0);
  const mediaConversao = comRecebidos.length
    ? Math.round(comRecebidos.reduce((s, e) => s + e.taxa, 0) / comRecebidos.length)
    : 0;

  const nomeSelecionado = atendente
    ? entries.find((e) => e.operatorId === atendente)?.name
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Ranking de vendas</h1>
        <p className="text-sm text-secondary">
          Vendas confirmadas por atendente. Clique num nome pra ver as vendas dele.
        </p>
      </div>

      {/* Pódio */}
      {ordemPodio.length > 0 && (
        <div className="mx-auto grid max-w-2xl grid-cols-3 items-end gap-3">
          {ordemPodio.map((e) => {
            const posicao = top3.indexOf(e) + 1;
            return (
              <div key={e.operatorId} className={posicao === 1 ? "-mt-4" : ""}>
                <PodiumCard
                  entry={e}
                  posicao={posicao}
                  destaque={posicao === 1}
                  href={comParams({ ...linkBase, atendente: e.operatorId })}
                />
                <div
                  className={cn(
                    "mt-2 rounded-lg border py-2 text-center font-mono text-sm font-bold",
                    posicao === 1
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-secondary"
                  )}
                >
                  {posicao}º
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filtros de período */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-title">Ranking completo</h2>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODOS.map((p) => (
            <Link
              key={p.value}
              href={comParams({ period: p.value, atendente })}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                periodoAtivo === p.value
                  ? "bg-accent text-app"
                  : "border border-border bg-surface text-secondary hover:text-primary"
              )}
            >
              {p.label}
            </Link>
          ))}
          <RankingDatePicker
            value={periodoAtivo === "custom" ? (from ?? "") : ""}
            atendente={atendente}
          />
        </div>
      </div>

      {/* Tabela completa */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className="px-4 py-3 font-medium">Posição</th>
                <th className="px-4 py-3 font-medium">Atendente</th>
                <th className="px-4 py-3 font-medium">Leads recebidos</th>
                <th className="px-4 py-3 font-medium">Vendas</th>
                <th className="px-4 py-3 font-medium">Conversão</th>
                <th className="px-4 py-3 text-right font-medium">Receita</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const selecionado = e.operatorId === atendente;
                return (
                  <tr
                    key={e.operatorId}
                    className={cn(
                      "border-b border-border last:border-0",
                      selecionado ? "bg-accent/10" : "hover:bg-app"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-secondary">
                        {i < 3 && <span>{MEDALHA[i]}</span>}
                        {i + 1}º
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={comParams({ ...linkBase, atendente: e.operatorId })}
                        className="font-medium text-primary hover:text-accent hover:underline"
                      >
                        {e.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-secondary">{e.recebidos}</td>
                    <td className="px-4 py-3 font-mono text-primary">{e.vendas}</td>
                    <td className="px-4 py-3 font-mono text-secondary">{e.taxa}%</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-success">
                      {brl(e.receita)}
                    </td>
                  </tr>
                );
              })}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-secondary">
                    Nenhum atendente cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vendas do atendente selecionado */}
      {atendente && vendasDoSelecionado && (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-title">
              Vendas de {nomeSelecionado ?? "atendente"}
              <span className="ml-2 font-mono text-xs text-muted">
                {vendasDoSelecionado.length} no período
              </span>
            </h2>
            <Link
              href={comParams(linkBase)}
              className="text-xs font-semibold text-secondary hover:text-primary"
            >
              Fechar
            </Link>
          </div>
          {vendasDoSelecionado.length === 0 ? (
            <p className="text-sm text-secondary">Nenhuma venda dele nesse período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-secondary">
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Produto</th>
                    <th className="px-3 py-2 font-medium">Quando</th>
                    <th className="px-3 py-2 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasDoSelecionado.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-primary">{s.customerName}</td>
                      <td className="px-3 py-2 text-secondary">{s.product ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs text-secondary">
                        {horaBR(s.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-success">
                        {brl(s.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Destaques */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-secondary">Melhor taxa de conversão</p>
          <p className="mt-1 font-mono text-2xl font-bold text-success">{melhorTaxa?.taxa ?? 0}%</p>
          <p className="text-[11px] text-muted">{melhorTaxa?.name ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Maior receita gerada</p>
          <p className="mt-1 font-mono text-2xl font-bold text-accent">{brl(maiorReceita?.receita ?? 0)}</p>
          <p className="text-[11px] text-muted">{maiorReceita?.name ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Média de conversão</p>
          <p className="mt-1 font-mono text-2xl font-bold text-primary">{mediaConversao}%</p>
          <p className="text-[11px] text-muted">do time</p>
        </Card>
      </div>

      <p className="text-xs text-muted">
        Conversão = vendas divididas pelos leads recebidos no período. A venda é creditada a
        quem tinha o lead na fila, então quem recebe muito lead de uma vez (uma
        importação, por exemplo) aparece mais alto por alguns dias. Cada venda é
        um cliente por dia — se o mesmo cliente paga várias ofertas no mesmo dia
        (upsell), conta como uma venda (igual ao painel do gateway); já a receita
        soma todos os pagamentos.
      </p>
    </div>
  );
}
