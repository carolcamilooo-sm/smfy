import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  getEffectiveStatus,
  grupoValeNaCategoria,
  splitShares,
  weightForCategory,
  type DistributionCategory,
} from "@/lib/distribution";
import { getSalesRanking } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OperatorRow } from "./operator-row";
import { AttendanceGroups } from "@/components/attendance-groups";
import { updateProductAccess } from "@/app/dashboard/produtores/actions";
import {
  approveOperator,
  rejectOperator,
  removeOperator,
  reactivateOperator,
  updateDistribution,
  createGroup,
  updateGroup,
  removeGroup,
} from "./actions";

export const dynamic = "force-dynamic";

const RANKING_PERIODS = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
];

/**
 * Quanto os grupos reservam numa categoria e quanto sobra pros individuais.
 * Só entram grupos ativos e com pelo menos uma conta — grupo vazio não segura
 * fatia nenhuma, igual à distribuição de verdade.
 */
function categorySummary(
  label: string,
  category: DistributionCategory,
  groups: { active: boolean; weightApproved: number; weightPending: number; weightDeclined: number; memberCount: number }[],
  individualCount: number
) {
  const reserved = groups
    .filter((g) => g.active && g.memberCount > 0)
    .reduce((sum, g) => sum + weightForCategory(g, category), 0);
  const leftover = 100 - reserved;
  const excedeu = reserved > 100;

  return (
    <span key={label}>
      {label}: grupos{" "}
      <span
        className={
          excedeu ? "font-mono font-semibold text-danger" : "font-mono font-semibold text-primary"
        }
      >
        {reserved}%
      </span>
      {excedeu ? (
        <span className="text-danger"> — passou de 100%, os individuais ficam sem nada</span>
      ) : (
        <>
          {" · individuais dividem "}
          <span className="font-mono font-semibold text-success">{leftover}%</span>
          {individualCount > 0 && (
            <span className="text-muted">
              {" "}
              ({individualCount} conta{individualCount > 1 ? "s" : ""})
            </span>
          )}
        </>
      )}
    </span>
  );
}

export default async function OperadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ rankingPeriod?: string }>;
}) {
  const { rankingPeriod } = await searchParams;
  const [operators, pending, rejected, deactivated, products, productAccesses, groups, { range: rankingRange, ranking }] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: "OPERATOR", approvalStatus: "APPROVED", active: true },
        include: { distributionRule: true, group: true },
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
      // Produto inativo continua aqui: a trava de acesso vale por produtor, e
      // esconder o produto deixaria acesso já configurado sem como editar
      // (foi o que aconteceu com CNP FABIO e CNP LEO).
      prisma.product.findMany({
        where: { producer: { active: true } },
        select: { id: true, name: true, active: true, producer: { select: { name: true } } },
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
      prisma.attendanceGroup.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { members: true } } },
      }),
      getSalesRanking({ period: rankingPeriod }),
    ]);

  // Fatia de cada conta, categoria por categoria, pela mesma conta que a
  // distribuição faz — só que considerando todo mundo disponível (e não só quem
  // está online agora), pra a tabela não ficar dançando a cada refresh.
  // Só aprovados tem % de grupo, então é a única categoria com fatia pra
  // mostrar. Nas outras todo mundo cai no rodízio, e a tabela diz isso.
  const disponiveisNa = (category: DistributionCategory) =>
    operators.filter(
      (op) => grupoValeNaCategoria(op.group, category) || Boolean(op.distributionRule?.active)
    );
  const sharesApproved = splitShares(disponiveisNa("approved"), "approved");
  const individuaisNa = (category: DistributionCategory) =>
    disponiveisNa(category).filter((op) => !grupoValeNaCategoria(op.group, category)).length;

  // Número = fatia garantida pelo grupo; null = entra no rodízio.
  const shareDaConta = (op: (typeof operators)[number]): number | null =>
    grupoValeNaCategoria(op.group, "approved") ? (sharesApproved.get(op.id) ?? 0) : null;

  const groupsForUi = groups.map((g) => ({
    id: g.id,
    name: g.name,
    weightApproved: g.weightApproved,
    weightPending: g.weightPending,
    weightDeclined: g.weightDeclined,
    active: g.active,
    memberCount: g._count.members,
  }));
  const operatorsForGroups = operators.map((op) => ({ id: op.id, name: op.name, groupId: op.groupId }));

  type ProductForUi = { id: string; name: string; active: boolean };
  const productGroups = Array.from(
    products
      .reduce((acc, p) => {
        const key = p.producer.name;
        if (!acc.has(key)) acc.set(key, { producerName: key, products: [] as ProductForUi[] });
        acc.get(key)!.products.push({ id: p.id, name: p.name, active: p.active });
        return acc;
      }, new Map<string, { producerName: string; products: ProductForUi[] }>())
      .values()
  );

  // Produtor sem ninguém marcado libera pra todo mundo. Como isso é o contrário
  // do que a tela de acesso sugere, vale avisar em vez de deixar passar calado.
  const productIdsByProducer = new Map<string, string[]>();
  for (const p of products) {
    const list = productIdsByProducer.get(p.producer.name) ?? [];
    list.push(p.id);
    productIdsByProducer.set(p.producer.name, list);
  }
  const produtoresSemTrava = [...productIdsByProducer]
    .filter(([, ids]) =>
      !productAccesses.some((a) => ids.includes(a.productId) && (a.allowApproved || a.allowPending))
    )
    .map(([name]) => name);

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

      <AttendanceGroups
        groups={groupsForUi}
        operators={operatorsForGroups}
        createGroup={createGroup}
        updateGroup={updateGroup}
        removeGroup={removeGroup}
      />

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-title">
          Distribuição de leads
        </h2>
        <p className="mb-4 text-xs text-secondary">
          A distribuição entre as contas individuais é automática e premia quem
          trabalha: o próximo lead vai pra quem tem a <strong>menor fila em
          aberto no dia</strong>. Quem zera volta pro topo e recebe mais; quem
          deixa acumular sai da roda até dar conta. Quem tem % é só o grupo de
          atendimento — ele reserva a fatia dele e o resto fica pros
          individuais. Vale pra quem está online e não está ocioso há mais de
          15 minutos.
        </p>
        <p className="mb-4 text-xs text-secondary">
          Quem recebe o quê é decidido no botão <strong>Produtos</strong> de cada
          atendente: só recebe leads de um produtor quem estiver marcado nele.
          O rodízio e a % do grupo valem apenas entre os liberados pra aquele
          lead. Leads recusados não passam por essa trava — vão pra todo mundo,
          porque não existe marcação de recusados.
        </p>
        {produtoresSemTrava.length > 0 && (
          <p className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            <strong>{produtoresSemTrava.join(", ")}</strong>: nenhum atendente
            marcado. Os leads aprovados e pendentes desse produtor vão ficar em
            espera até você marcar alguém no botão Produtos.
          </p>
        )}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[1.1fr_1.5fr_0.9fr_auto_auto_auto_auto_auto_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
            <div className="text-xs text-secondary">Nome</div>
            <div className="text-xs text-secondary">E-mail</div>
            <div className="text-xs text-secondary">Status</div>
            <div
              className="text-xs text-secondary"
              title="Fatia garantida dos leads aprovados. 'rodízio' = sem % fixa."
            >
              Fatia aprov.
            </div>
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
                share={
                  op.groupId || op.distributionRule?.active
                    ? { approved: shareDaConta(op), groupName: op.group?.name ?? null }
                    : null
                }
                productGroups={productGroups}
                accessByProductId={accessByOperator.get(op.id) ?? new Map()}
                updateDistribution={updateDistribution}
                updateProductAccess={updateProductAccess}
                removeOperator={removeOperator}
              />
            ))}

            {operators.length === 0 && (
              <div className="col-span-10 py-4 text-center text-secondary">
                Nenhum operador cadastrado ainda.
              </div>
            )}
          </div>
        </div>

        {operators.length > 0 && (
          <div className="mt-4 flex flex-col gap-1 text-xs text-secondary">
            {categorySummary("Aprovados", "approved", groupsForUi, individuaisNa("approved"))}
            <span className="text-muted">
              Pendentes e recusados: sem % de grupo, vão 100% pelo rodízio.
            </span>
            <span className="mt-1 text-muted">
              A fatia mostrada considera todo mundo disponível. Quando alguém sai
              ou fica ocioso, a parte dele é redividida na hora entre os que
              ficaram.
            </span>
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
