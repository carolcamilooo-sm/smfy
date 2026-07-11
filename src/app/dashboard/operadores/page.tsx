import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  approveOperator,
  rejectOperator,
  updateDistribution,
} from "./actions";

export const dynamic = "force-dynamic";

function operatorStatusBadge(status: string) {
  if (status === "ONLINE") return <Badge tone="green">Online</Badge>;
  if (status === "IDLE") return <Badge tone="yellow">Ocioso</Badge>;
  return <Badge tone="gray">Offline</Badge>;
}

function sumLabel(label: string, sum: number) {
  return (
    <span>
      {label}:{" "}
      <span
        className={
          sum === 100 ? "font-mono font-semibold text-success" : "font-mono font-semibold text-warning"
        }
      >
        {sum}%{sum === 100 ? " ✓" : ""}
      </span>
    </span>
  );
}

export default async function OperadoresPage() {
  const [operators, pending, rejected] = await Promise.all([
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "APPROVED" },
      include: { distributionRule: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "REJECTED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const active = operators.filter((op) => op.distributionRule?.active);
  const sumApproved = active.reduce((sum, op) => sum + (op.distributionRule?.weightApproved ?? 0), 0);
  const sumPending = active.reduce((sum, op) => sum + (op.distributionRule?.weightPending ?? 0), 0);
  const sumDeclined = active.reduce((sum, op) => sum + (op.distributionRule?.weightDeclined ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Equipe de Atendimento
        </h1>
        <p className="text-sm text-secondary">
          Gerencie operadores, aprovações e a distribuição de leads.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Solicitações pendentes
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-secondary">
            Nenhuma solicitação pendente.
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
              >
                <div>
                  <p className="text-sm text-primary">{p.name}</p>
                  <p className="text-xs text-secondary">{p.email}</p>
                </div>
                <div className="flex gap-2">
                  <form action={approveOperator}>
                    <input type="hidden" name="operatorId" value={p.id} />
                    <Button type="submit">Aceitar</Button>
                  </form>
                  <form action={rejectOperator}>
                    <input type="hidden" name="operatorId" value={p.id} />
                    <Button type="submit" variant="danger">
                      Recusar
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Distribuição de leads
        </h2>
        <p className="mb-4 text-xs text-secondary">
          Cada categoria de pagamento tem sua própria %, calculada
          independente das outras. Um operador com 30% em &quot;Aprovados&quot;
          recebe cerca de 30% dos leads aprovados do dia, desde que
          esteja online e não esteja ocioso há mais de 15 minutos.
        </p>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[1.1fr_1.5fr_0.9fr_5rem_5rem_5rem_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
            <div className="text-xs text-secondary">Nome</div>
            <div className="text-xs text-secondary">E-mail</div>
            <div className="text-xs text-secondary">Status</div>
            <div className="text-xs text-secondary">% Aprovados</div>
            <div className="text-xs text-secondary">% Pendentes</div>
            <div className="text-xs text-secondary">% Carrinhos</div>
            <div className="text-xs text-secondary">Ativo</div>
            <div />

            {operators.map((op) => (
              <form
                key={op.id}
                action={updateDistribution}
                className="contents"
              >
                <input type="hidden" name="operatorId" value={op.id} />
                <div className="border-t border-border py-2 text-primary">{op.name}</div>
                <div className="border-t border-border py-2 text-secondary">
                  {op.email}
                </div>
                <div className="border-t border-border py-2">
                  {operatorStatusBadge(getEffectiveStatus(op))}
                </div>
                <div className="border-t border-border py-2">
                  <Input
                    type="number"
                    name="weightApproved"
                    min={0}
                    max={100}
                    defaultValue={op.distributionRule?.weightApproved ?? 0}
                    className="w-16 font-mono"
                  />
                </div>
                <div className="border-t border-border py-2">
                  <Input
                    type="number"
                    name="weightPending"
                    min={0}
                    max={100}
                    defaultValue={op.distributionRule?.weightPending ?? 0}
                    className="w-16 font-mono"
                  />
                </div>
                <div className="border-t border-border py-2">
                  <Input
                    type="number"
                    name="weightDeclined"
                    min={0}
                    max={100}
                    defaultValue={op.distributionRule?.weightDeclined ?? 0}
                    className="w-16 font-mono"
                  />
                </div>
                <div className="border-t border-border py-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={op.distributionRule?.active ?? true}
                    className="h-4 w-4"
                  />
                </div>
                <div className="border-t border-border py-2">
                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                </div>
              </form>
            ))}

            {operators.length === 0 && (
              <div className="col-span-8 py-4 text-center text-secondary">
                Nenhum operador cadastrado ainda.
              </div>
            )}
          </div>
        </div>

        {operators.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-secondary">
            {sumLabel("Soma Aprovados", sumApproved)}
            {sumLabel("Soma Pendentes", sumPending)}
            {sumLabel("Soma Carrinhos", sumDeclined)}
          </div>
        )}
      </Card>

      {rejected.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-primary">
            Recusados
          </h2>
          <div className="space-y-2">
            {rejected.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
              >
                <div>
                  <p className="text-sm text-secondary">{r.name}</p>
                  <p className="text-xs text-muted">{r.email}</p>
                </div>
                <Badge tone="red">Recusado</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
