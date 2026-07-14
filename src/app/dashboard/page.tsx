import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getDashboardData, searchLeads } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { LeadToast } from "@/components/lead-toast";
import { LeadVolumeChart } from "@/components/lead-volume-chart";
import { DashboardSortable } from "@/components/dashboard-sortable";
import { CHANNELS, EVENTS } from "@/lib/realtime";
import { BR_TIMEZONE } from "@/lib/date-br";
import { normalizeDashboardLayout, normalizeDashboardWidths, type DashboardBlockKey } from "@/lib/dashboard-layout";
import { updateDashboardLayout, updateDashboardBlockWidth } from "./actions";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "month", label: "Este mês" },
];

function periodLabel(period: string) {
  if (period === "yesterday") return "de ontem";
  if (period === "7d") return "dos últimos 7 dias";
  if (period === "month") return "deste mês";
  if (period === "custom") return "do período selecionado";
  return "de hoje";
}

function paymentBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Aprovado</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  if (status === "DECLINED") return <Badge tone="red">Recusado</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

function serviceBadge(status: string) {
  if (status === "WAITING") return <Badge tone="red">Aguardando</Badge>;
  if (status === "ASSIGNED") return <Badge tone="blue">Em atendimento</Badge>;
  return <Badge tone="green">Atendido</Badge>;
}

function operatorStatusDot(status: string) {
  if (status === "ONLINE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" /> Online
      </span>
    );
  }
  if (status === "IDLE") {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Ocioso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" /> Offline
    </span>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; period?: string; from?: string; to?: string }>;
}) {
  const { q, period, from, to } = await searchParams;
  const [session, { range, stats, volume, operatorSummaries, leads, producerSummary }] = await Promise.all([
    auth(),
    getDashboardData({ period, from, to }),
  ]);
  const searchResults = q ? await searchLeads(q) : null;

  const currentUser = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { dashboardLayout: true, dashboardBlockWidths: true },
      })
    : null;
  const layout = normalizeDashboardLayout(currentUser?.dashboardLayout ?? []);
  const widths = normalizeDashboardWidths(currentUser?.dashboardBlockWidths);

  const onlineCount = operatorSummaries.filter((op) => op.effectiveStatus !== "OFFLINE").length;
  const offlineCount = operatorSummaries.length - onlineCount;

  const distribution = [...operatorSummaries].sort((a, b) => b.weightApproved - a.weightApproved);

  const blocks: Record<DashboardBlockKey, React.ReactNode> = {
    "buscar-atendimento": (
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Buscar atendimento
        </h2>
        <p className="mb-4 text-xs text-secondary">
          Encontre qual operador atendeu um lead pelo nome, e-mail ou
          WhatsApp do cliente.
        </p>
        <form method="get" className="flex gap-2">
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Nome, e-mail ou WhatsApp do cliente"
            className="max-w-sm"
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>

        {searchResults && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-secondary">
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Telefone</th>
                  <th className="pb-2">Produtor</th>
                  <th className="pb-2">Atendimento</th>
                  <th className="pb-2">Operador que atendeu</th>
                  <th className="pb-2">Atendido em</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map((lead) => (
                  <tr key={lead.id} className="border-t border-border">
                    <td className="py-2 text-primary">{lead.customerName}</td>
                    <td className="py-2 font-mono text-secondary">{lead.phone}</td>
                    <td className="py-2 text-secondary">
                      {lead.producer?.name ?? "-"}
                    </td>
                    <td className="py-2">{serviceBadge(lead.serviceStatus)}</td>
                    <td className="py-2 text-secondary">
                      {lead.assignedOperator?.name ?? "-"}
                    </td>
                    <td className="py-2 font-mono text-muted">
                      {lead.attendedAt
                        ? new Date(lead.attendedAt).toLocaleString("pt-BR", { timeZone: BR_TIMEZONE })
                        : "-"}
                    </td>
                  </tr>
                ))}
                {searchResults.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-secondary">
                      Nenhum lead encontrado para &quot;{q}&quot;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    ),

    "leads-por-produtor": (
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Leads por produtor {periodLabel(range.period)}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-secondary">
                <th className="pb-2 pr-3">Produtor</th>
                <th className="pb-2 pr-3">Aprovados</th>
                <th className="pb-2 pr-3">Pendentes</th>
                <th className="pb-2 pr-3">Pagamento recusado</th>
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {producerSummary.map((p) => (
                <tr key={p.producerId ?? "sem-produtor"} className="border-t border-border">
                  <td className="py-2 text-primary">{p.name}</td>
                  <td className="py-2 font-mono text-success">{p.approved}</td>
                  <td className="py-2 font-mono text-warning">{p.pending}</td>
                  <td className="py-2 font-mono text-danger">{p.declined}</td>
                  <td className="py-2 font-mono text-secondary">
                    {p.approved + p.pending + p.declined}
                  </td>
                </tr>
              ))}
              {producerSummary.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-secondary">
                    Nenhum lead recebido no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    ),

    "volume-leads": (
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Volume de leads {periodLabel(range.period)}
        </h2>
        <LeadVolumeChart data={volume} />
      </Card>
    ),

    "distribuicao-atendente": (
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Distribuição por atendente
        </h2>
        <p className="mb-3 text-xs text-secondary">% de leads aprovados (vendas)</p>
        <div className="space-y-3">
          {distribution.map((op) => (
            <div key={op.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-primary">{op.name}</span>
                <span className="font-mono text-secondary">{op.weightApproved}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, op.weightApproved)}%` }}
                />
              </div>
            </div>
          ))}
          {distribution.length === 0 && (
            <p className="text-sm text-secondary">
              Nenhum operador cadastrado ainda.
            </p>
          )}
        </div>
      </Card>
    ),

    "leads-recentes": (
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-primary">
            Leads mais recentes de hoje
          </h2>
          <Link href="/dashboard/historico" className="text-xs text-accent hover:underline">
            Ver histórico completo →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-secondary">
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Produtor</th>
                <th className="pb-2">Gateway</th>
                <th className="pb-2">Produto</th>
                <th className="pb-2">Pagamento</th>
                <th className="pb-2">Atendimento</th>
                <th className="pb-2">Operador</th>
                <th className="pb-2">Receb.</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="py-2 text-primary">{lead.customerName}</td>
                  <td className="py-2 text-secondary">
                    {lead.producer?.name ?? "-"}
                  </td>
                  <td className="py-2 text-secondary">{lead.gateway}</td>
                  <td className="py-2 text-secondary">{lead.product ?? "-"}</td>
                  <td className="py-2">{paymentBadge(lead.paymentStatus)}</td>
                  <td className="py-2">{serviceBadge(lead.serviceStatus)}</td>
                  <td className="py-2 text-secondary">
                    {lead.assignedOperator?.name ?? "-"}
                  </td>
                  <td className="py-2 font-mono text-muted">
                    {new Date(lead.createdAt).toLocaleString("pt-BR", { timeZone: BR_TIMEZONE })}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-secondary">
                    Nenhum lead recebido ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    ),

    operadores: (
      <Card>
        <div className="mb-4 flex items-center justify-between pr-16">
          <h2 className="text-sm font-semibold text-primary">Operadores</h2>
          <p className="text-xs">
            <span className="font-mono text-success">{onlineCount} online</span>
            <span className="text-secondary"> · </span>
            <span className="font-mono text-secondary">{offlineCount} offline</span>
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-secondary">
                <th className="pb-2">Nome</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">% Aprovados</th>
                <th className="pb-2">Atendidos</th>
              </tr>
            </thead>
            <tbody>
              {operatorSummaries.map((op) => (
                <tr key={op.id} className="border-t border-border">
                  <td className="py-2 text-primary">{op.name}</td>
                  <td className="py-2">{operatorStatusDot(op.effectiveStatus)}</td>
                  <td className="py-2 font-mono text-secondary">{op.weightApproved}%</td>
                  <td className="py-2 font-mono text-secondary">{op.attendedInRange}</td>
                </tr>
              ))}
              {operatorSummaries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-secondary">
                    Nenhum operador cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    ),
  };

  return (
    <div className="space-y-8">
      <RealtimeRefresher
        channel={CHANNELS.admin}
        events={[
          EVENTS.leadNew,
          EVENTS.leadAssigned,
          EVENTS.leadAttended,
          EVENTS.operatorStatusChanged,
        ]}
      />
      <LeadToast />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`?period=${p.key}`}
              className={
                range.period === p.key
                  ? "rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-app"
                  : "rounded-lg px-3 py-1.5 text-sm text-secondary hover:text-primary"
              }
            >
              {p.label}
            </Link>
          ))}
          <form method="get" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="period" value="custom" />
            <input
              type="date"
              name="from"
              defaultValue={period === "custom" ? from : undefined}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary focus:border-accent focus:outline-none"
            />
            <span className="text-xs text-secondary">até</span>
            <input
              type="date"
              name="to"
              defaultValue={period === "custom" ? to : undefined}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary focus:border-accent focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              Aplicar
            </Button>
          </form>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-secondary">Leads pagos</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-primary">
            {stats.approved.total}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-success">
              Atendidos <span className="font-mono font-semibold">{stats.approved.attended}</span>
            </span>
            <span className="text-danger">
              Faltam <span className="font-mono font-semibold">{stats.approved.remaining}</span>
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Leads pendentes</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-primary">
            {stats.pending.total}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-success">
              Atendidos <span className="font-mono font-semibold">{stats.pending.attended}</span>
            </span>
            <span className="text-danger">
              Faltam <span className="font-mono font-semibold">{stats.pending.remaining}</span>
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Pagamento recusado</p>
          <p className="mt-1 font-mono text-3xl font-semibold text-primary">
            {stats.declined.total}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-success">
              Atendidos <span className="font-mono font-semibold">{stats.declined.attended}</span>
            </span>
            <span className="text-danger">
              Faltam <span className="font-mono font-semibold">{stats.declined.remaining}</span>
            </span>
          </div>
        </Card>
      </div>

      <DashboardSortable
        order={layout}
        widths={widths}
        blocks={blocks}
        saveOrder={updateDashboardLayout}
        saveWidth={updateDashboardBlockWidth}
      />
    </div>
  );
}
