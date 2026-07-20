import Link from "next/link";
import { getLeadsHistory, getLeadsPorAtendente } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HistoricoTable } from "@/components/historico-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "approved", label: "Aprovado" },
  { value: "pending", label: "Pendente" },
  { value: "declined", label: "Recusado" },
  { value: "other", label: "Outro" },
];

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "month", label: "Este mês" },
];

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    period?: string;
    producerId?: string;
    operatorId?: string;
    page?: string;
  }>;
}) {
  const { q, status, period, producerId, operatorId, page } = await searchParams;
  const statusParam =
    status === "approved" || status === "pending" || status === "declined" || status === "other"
      ? status
      : undefined;

  const [{ leads, total, page: currentPage, totalPages, range }, producers, operators, porAtendente] =
    await Promise.all([
      getLeadsHistory({
        q,
        status: statusParam,
        producerId,
        operatorId,
        period,
        page: page ? Number(page) : 1,
      }),
      prisma.producer.findMany({
        select: { id: true, name: true, active: true },
        orderBy: { name: "asc" },
      }),
      prisma.user.findMany({
        where: { role: "OPERATOR", approvalStatus: "APPROVED" },
        select: { id: true, name: true, active: true },
        orderBy: { name: "asc" },
      }),
      getLeadsPorAtendente({ q, status: statusParam, producerId, period }),
    ]);

  const totalNoPeriodo = porAtendente.linhas.reduce((s, l) => s + l.count, 0);

  // Descreve, em palavras, os filtros que estão valendo — pra o informativo
  // dizer "de que" é a contagem, e não só um número solto.
  const periodoLabel = PERIOD_OPTIONS.find((p) => p.value === range.period)?.label ?? range.period;
  const filtrosAtivos: string[] = [];
  if (statusParam) {
    filtrosAtivos.push(STATUS_OPTIONS.find((o) => o.value === statusParam)?.label ?? statusParam);
  }
  if (producerId) {
    filtrosAtivos.push(producers.find((p) => p.id === producerId)?.name ?? "produtor");
  }
  if (operatorId) {
    filtrosAtivos.push(
      operatorId === "none"
        ? "sem atendente"
        : (operators.find((o) => o.id === operatorId)?.name ?? "atendente")
    );
  }
  if (q?.trim()) filtrosAtivos.push(`busca "${q.trim()}"`);

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (producerId) params.set("producerId", producerId);
    if (operatorId) params.set("operatorId", operatorId);
    params.set("period", range.period);
    params.set("page", String(target));
    return `?${params.toString()}`;
  }

  const windowStart = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const pageNumbers = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => windowStart + i
  ).filter((n) => n >= 1 && n <= totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Histórico de Leads
        </h1>
        <p className="text-sm text-secondary">
          Visualize o histórico completo de leads processados e seus status.
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por cliente, produto..."
          className="max-w-xs flex-1"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary focus:border-accent focus:outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="period"
          defaultValue={range.period}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary focus:border-accent focus:outline-none"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="producerId"
          defaultValue={producerId ?? ""}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary focus:border-accent focus:outline-none"
        >
          <option value="">Todos os produtores</option>
          {producers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {!p.active ? " (arquivado)" : ""}
            </option>
          ))}
        </select>
        <select
          name="operatorId"
          defaultValue={operatorId ?? ""}
          className="rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary focus:border-accent focus:outline-none"
        >
          <option value="">Todos os atendentes</option>
          <option value="none">Sem atendente (em espera)</option>
          {operators.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {!o.active ? " (desativado)" : ""}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      {/* Informativo do filtro: a contagem em destaque, com os filtros ativos
          escritos por extenso. É o mesmo `total` do rodapé da tabela, mas aqui
          em cima e legível — responde "quantos batem com o que filtrei". */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
        <span className="font-mono text-2xl font-bold text-primary">{total}</span>
        <span className="text-sm text-secondary">
          {total === 1 ? "lead" : "leads"} · {periodoLabel.toLowerCase()}
          {filtrosAtivos.length > 0 && (
            <>
              {" · "}
              <span className="text-primary">{filtrosAtivos.join(" · ")}</span>
            </>
          )}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-title">Leads por atendente</h2>
          <span className="text-xs text-secondary">
            {PERIOD_OPTIONS.find((p) => p.value === range.period)?.label ?? range.period} ·{" "}
            <span className="font-mono text-primary">{totalNoPeriodo}</span> no total
          </span>
        </div>
        {porAtendente.linhas.length === 0 ? (
          <p className="text-xs text-secondary">Nenhum lead no período.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {porAtendente.linhas.map((l) => {
              const selecionado = (operatorId ?? "") === (l.operatorId ?? "none");
              return (
                <span
                  key={l.operatorId ?? "none"}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs " +
                    (selecionado
                      ? "border-accent bg-accent/10 text-primary"
                      : "border-border bg-app text-secondary")
                  }
                >
                  {l.name} <span className="font-mono font-semibold text-primary">{l.count}</span>
                </span>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted">
          Conta os leads que chegaram no período e foram entregues a cada um.
          Selecionar um atendente no filtro acima só muda a tabela — esta lista
          continua mostrando a equipe toda, pra dar comparação.
        </p>
      </div>

      <form
        method="get"
        action="/api/leads/export"
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="q" value={q ?? ""} />
        <input type="hidden" name="status" value={status ?? ""} />
        <input type="hidden" name="producerId" value={producerId ?? ""} />
        <input type="hidden" name="operatorId" value={operatorId ?? ""} />
        <input type="hidden" name="period" value={range.period} />
        <div>
          <label className="mb-1.5 block text-xs text-secondary">
            Quantidade de leads pra baixar (dos que batem com o filtro acima)
          </label>
          <Input
            type="number"
            name="limit"
            defaultValue={500}
            min={1}
            max={10000}
            className="w-40"
          />
        </div>
        <Button type="submit" variant="secondary">
          Baixar CSV
        </Button>
      </form>

      <HistoricoTable leads={leads} />

      <div className="flex items-center justify-between text-xs text-secondary">
        <div>
          Mostrando{" "}
          <span className="font-mono">{leads.length}</span> de{" "}
          <span className="font-mono">{total}</span> registros
        </div>
        <div className="flex gap-1.5">
          <Link
            href={pageHref(Math.max(1, currentPage - 1))}
            className="rounded border border-border bg-surface px-3 py-1.5 text-secondary hover:border-accent/50"
          >
            ← Anterior
          </Link>
          {pageNumbers.map((n) => (
            <Link
              key={n}
              href={pageHref(n)}
              className={
                n === currentPage
                  ? "rounded bg-accent px-3 py-1.5 font-semibold text-app"
                  : "rounded border border-border bg-surface px-3 py-1.5 text-secondary hover:border-accent/50"
              }
            >
              {n}
            </Link>
          ))}
          <Link
            href={pageHref(Math.min(totalPages, currentPage + 1))}
            className="rounded border border-border bg-surface px-3 py-1.5 text-secondary hover:border-accent/50"
          >
            Próximo →
          </Link>
        </div>
      </div>
    </div>
  );
}
