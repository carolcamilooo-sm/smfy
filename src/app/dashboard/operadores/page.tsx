import Link from "next/link";
import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";
import { getSalesRanking } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OperatorRow } from "./operator-row";
import { updateProductAccess } from "@/app/dashboard/produtores/actions";
import {
  approveOperator,
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
  const [operators, pending, rejected, deactivated, products, productAccesses, { range: rankingRange, ranking }] =
    await Promise.all([
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
      prisma.product.findMany({
        where: { active: true, producer: { active: true } },
        select: { id: true, name: true, producer: { select: { name: true } } },
        orderBy: [{ producer: { name: "asc" } }, { name: "asc" }],
      }),
      prisma.productAccess.findMany({
        select: {
          productId: true,
          operatorId: true,
          allowApproved: true,
          allowPending: true,
          dailyLimitApproved: true,
          dailyLimitPending: true,
        },
      }),
      getSalesRanking({ period: rankingPeriod }),
    ]);

  const active = operators.filter((op) => op.distributionRule?.active);
  const sumApproved = active.reduce((sum, op) => sum + (op.distributionRule?.weightApproved ?? 0), 0);
  const sumPending = active.reduce((sum, op) => sum + (op.distributionRule?.weightPending ?? 0), 0);
  const sumDeclined = active.reduce((sum, op) => sum + (op.distributionRule?.weightDeclined ?? 0), 0);

  const productGroups = Array.from(
    products
      .reduce((acc, p) => {
        const key = p.producer.name;
        if (!acc.has(key)) acc.set(key, { producerName: key, products: [] as { id: string; name: string }[] });
        acc.get(key)!.products.push({ id: p.id, name: p.name });
        return acc;
      }, new Map<string, { producerName: string; products: { id: string; name: string }[] }>())
      .values()
  );

  const accessByOperator = new Map<string, Map<string, (typeof productAccesses)[number]>>();
  for (const a of productAccesses) {
    if (!accessByOperator.has(a.operatorId)) accessByOperator.set(a.operatorId, new Map());
    accessByOperator.get(a.operatorId)!.set(a.productId, a);
  }

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
        <h2 className="mb-4 text-sm font-semibold text-title">
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
        <h2 className="mb-4 text-sm font-semibold text-title">
          Distribuição de leads
        </h2>
        <p className="mb-4 text-xs text-secondary">
          Cada categoria de pagamento tem sua própria %, calculada
          independente das outras. Um operador com 30% em &quot;Aprovados&quot;
          recebe cerca de 30% dos leads aprovados do dia, desde que
          esteja online e não esteja ocioso há mais de 15 minutos.
        </p>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[1.1fr_1.5fr_0.9fr_5rem_5rem_5rem_auto_auto_auto_auto_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
            <div className="text-xs text-secondary">Nome</div>
            <div className="text-xs text-secondary">E-mail</div>
            <div className="text-xs text-secondary">Status</div>
            <div className="text-xs text-secondary">% Aprovados</div>
            <div className="text-xs text-secondary">% Pendentes</div>
            <div className="text-xs text-secondary">% Recusados</div>
            <div className="text-xs text-secondary">Distrib. ativa</div>
            <div className="text-xs text-secondary">Prioridade</div>
            <div className="text-xs text-secondary">Atendente ativo</div>
            <div />
            <div />
            <div />

            {operators.map((op) => (
              <OperatorRow
                key={op.id}
                operator={op}
                effectiveStatus={getEffectiveStatus(op)}
                productGroups={productGroups}
                accessByProductId={accessByOperator.get(op.id) ?? new Map()}
                updateDistribution={updateDistribution}
                updateProductAccess={updateProductAccess}
                removeOperator={removeOperator}
              />
            ))}

            {operators.length === 0 && (
              <div className="col-span-12 py-4 text-center text-secondary">
                Nenhum operador cadastrado ainda.
              </div>
            )}
          </div>
        </div>

        {operators.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-secondary">
            {sumLabel("Soma Aprovados", sumApproved)}
            {sumLabel("Soma Pendentes", sumPending)}
            {sumLabel("Soma Recusados", sumDeclined)}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-title">
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
          <h2 className="mb-4 text-sm font-semibold text-title">
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
          <h2 className="mb-4 text-sm font-semibold text-title">
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
