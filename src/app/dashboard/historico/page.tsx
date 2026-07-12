import Link from "next/link";
import { getLeadsHistory } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HistoricoTable } from "@/components/historico-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "approved", label: "Aprovado" },
  { value: "pending", label: "Pendente" },
  { value: "declined", label: "Carrinho" },
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
    page?: string;
  }>;
}) {
  const { q, status, period, producerId, page } = await searchParams;
  const statusParam =
    status === "approved" || status === "pending" || status === "declined" || status === "other"
      ? status
      : undefined;

  const [{ leads, total, page: currentPage, totalPages, range }, producers] = await Promise.all([
    getLeadsHistory({
      q,
      status: statusParam,
      producerId,
      period,
      page: page ? Number(page) : 1,
    }),
    prisma.producer.findMany({
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (producerId) params.set("producerId", producerId);
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
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <form
        method="get"
        action="/api/leads/export"
        className="flex flex-wrap items-end gap-3"
      >
        <input type="hidden" name="q" value={q ?? ""} />
        <input type="hidden" name="status" value={status ?? ""} />
        <input type="hidden" name="producerId" value={producerId ?? ""} />
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
