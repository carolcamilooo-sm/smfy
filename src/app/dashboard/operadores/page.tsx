import { Fragment } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";
import { getSalesRanking } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { cn } from "@/lib/utils";
import {
  approveOperator,
  createOperator,
  rejectOperator,
  removeOperator,
  reactivateOperator,
  updateDistribution,
} from "./actions";

export const dynamic = "force-dynamic";

const RANKING_PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
];

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

export default async function OperadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ rankingPeriod?: string }>;
}) {
  const { rankingPeriod } = await searchParams;
  const [operators, pending, rejected, deactivated, { range: rankingRange, ranking }] = await Promise.all([
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "APPROVED", active: true },
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
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "APPROVED", active: false },
      orderBy: { name: "asc" },
    }),
    getSalesRanking({ period: rankingPeriod }),
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

      <Card className="max-w-2xl">
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Adicionar colaborador
        </h2>
        <p className="mb-4 text-xs text-secondary">
          Cria a conta já aprovada, sem precisar passar pelo cadastro
          público e pela fila de aprovação.
        </p>
        <form
          action={createOperator}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1.4fr_1fr_auto] sm:items-end"
        >
          <div>
            <label className="mb-1.5 block text-xs text-secondary">Nome</label>
            <Input name="name" placeholder="Nome do colaborador" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-secondary">E-mail</label>
            <Input name="email" type="email" placeholder="email@exemplo.com" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-secondary">Senha</label>
            <Input name="password" type="password" placeholder="6+ caracteres" minLength={6} required />
          </div>
          <Button type="submit">Cadastrar</Button>
        </form>
      </Card>

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
          <div className="grid grid-cols-[1.1fr_1.5fr_0.9fr_5rem_5rem_5rem_auto_auto_auto_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
            <div className="text-xs text-secondary">Nome</div>
            <div className="text-xs text-secondary">E-mail</div>
            <div className="text-xs text-secondary">Status</div>
            <div className="text-xs text-secondary">% Aprovados</div>
            <div className="text-xs text-secondary">% Pendentes</div>
            <div className="text-xs text-secondary">% Carrinhos</div>
            <div className="text-xs text-secondary">Distrib. ativa</div>
            <div className="text-xs text-secondary">Prioridade</div>
            <div className="text-xs text-secondary">Atendente ativo</div>
            <div />
            <div />

            {operators.map((op) => (
              <Fragment key={op.id}>
                <form action={updateDistribution} className="contents">
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
                    <input
                      type="checkbox"
                      name="priority"
                      defaultChecked={op.priority}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="border-t border-border py-2">
                    <input
                      type="checkbox"
                      name="userActive"
                      defaultChecked={op.active}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="border-t border-border py-2">
                    <Button type="submit" variant="secondary">
                      Salvar
                    </Button>
                  </div>
                </form>
                <ConfirmForm
                  action={removeOperator}
                  confirmMessage={`Remover "${op.name}" da equipe? Se ele já atendeu algum lead, a conta só fica desativada (histórico preservado); senão é excluída de vez.`}
                  className="contents"
                >
                  <input type="hidden" name="operatorId" value={op.id} />
                  <div className="border-t border-border py-2">
                    <Button type="submit" variant="danger">
                      Remover
                    </Button>
                  </div>
                </ConfirmForm>
              </Fragment>
            ))}

            {operators.length === 0 && (
              <div className="col-span-11 py-4 text-center text-secondary">
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

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-primary">
            Ranking de vendas (webhook pessoal)
          </h2>
          <div className="flex flex-wrap gap-2">
            {RANKING_PERIODS.map((p) => (
              <Link
                key={p.value}
                href={`?rankingPeriod=${p.value}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  rankingRange.period === p.value
                    ? "bg-accent text-app"
                    : "border border-border bg-surface text-secondary hover:text-primary"
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>
        <p className="mb-4 text-xs text-secondary">
          Contagem de vendas confirmadas pelo webhook pessoal de cada
          atendente (Ajustes → Meu webhook de vendas) — os atendentes só
          veem o top 5 e a própria posição; aqui você vê todo mundo.
        </p>
        <div className="space-y-1.5">
          {ranking.map((entry, i) => (
            <div
              key={entry.operatorId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-app px-4 py-2.5"
            >
              <span className="text-sm text-primary">
                <span className="mr-2 font-mono text-xs text-muted">{i + 1}º</span>
                {entry.name}
              </span>
              <span className="font-mono text-sm font-semibold text-accent">
                {entry.count}
              </span>
            </div>
          ))}
          {ranking.length === 0 && (
            <p className="text-sm text-secondary">Nenhum operador cadastrado ainda.</p>
          )}
        </div>
      </Card>

      {deactivated.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-primary">
            Atendentes desativados
          </h2>
          <div className="space-y-2">
            {deactivated.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
              >
                <div className="flex items-center gap-2.5">
                  <div>
                    <p className="text-sm text-secondary">{d.name}</p>
                    <p className="text-xs text-muted">{d.email}</p>
                  </div>
                  <Badge tone="gray">Desativado</Badge>
                </div>
                <form action={reactivateOperator}>
                  <input type="hidden" name="operatorId" value={d.id} />
                  <Button type="submit" variant="secondary">
                    Reativar
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}

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
