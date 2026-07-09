import { getDashboardData } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RealtimeRefresher } from "@/components/realtime-refresher";
import { CHANNELS, EVENTS } from "@/lib/realtime";

export const dynamic = "force-dynamic";

function paymentBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Aprovado</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

function serviceBadge(status: string) {
  if (status === "WAITING") return <Badge tone="red">Aguardando</Badge>;
  if (status === "ASSIGNED") return <Badge tone="blue">Em atendimento</Badge>;
  return <Badge tone="green">Atendido</Badge>;
}

function operatorStatusBadge(status: string) {
  if (status === "ONLINE") return <Badge tone="green">Online</Badge>;
  if (status === "IDLE") return <Badge tone="yellow">Ocioso</Badge>;
  return <Badge tone="gray">Offline</Badge>;
}

export default async function DashboardPage() {
  const { stats, operatorSummaries, leads } = await getDashboardData();

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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs text-neutral-400">Leads hoje</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">Aprovados</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">
            {stats.approved}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">Pendentes</p>
          <p className="mt-1 text-2xl font-semibold text-amber-400">
            {stats.pending}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-400">Aguardando atendimento</p>
          <p className="mt-1 text-2xl font-semibold text-red-400">
            {stats.waiting}
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">
          Operadores
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-neutral-500">
                <th className="pb-2">Nome</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Peso</th>
                <th className="pb-2">Atendidos hoje</th>
              </tr>
            </thead>
            <tbody>
              {operatorSummaries.map((op) => (
                <tr key={op.id} className="border-t border-neutral-800">
                  <td className="py-2">{op.name}</td>
                  <td className="py-2">{operatorStatusBadge(op.effectiveStatus)}</td>
                  <td className="py-2">{op.weight}</td>
                  <td className="py-2">{op.attendedToday}</td>
                </tr>
              ))}
              {operatorSummaries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-neutral-500">
                    Nenhum operador cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">
          Leads de hoje
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-neutral-500">
                <th className="pb-2">Cliente</th>
                <th className="pb-2">Gateway</th>
                <th className="pb-2">Produto</th>
                <th className="pb-2">Pagamento</th>
                <th className="pb-2">Atendimento</th>
                <th className="pb-2">Operador</th>
                <th className="pb-2">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-neutral-800">
                  <td className="py-2">{lead.customerName}</td>
                  <td className="py-2 text-neutral-400">{lead.gateway}</td>
                  <td className="py-2 text-neutral-400">{lead.product ?? "-"}</td>
                  <td className="py-2">{paymentBadge(lead.paymentStatus)}</td>
                  <td className="py-2">{serviceBadge(lead.serviceStatus)}</td>
                  <td className="py-2 text-neutral-400">
                    {lead.assignedOperator?.name ?? "-"}
                  </td>
                  <td className="py-2 text-neutral-500">
                    {new Date(lead.createdAt).toLocaleTimeString("pt-BR")}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-neutral-500">
                    Nenhum lead recebido hoje ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
