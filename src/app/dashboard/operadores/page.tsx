import { prisma } from "@/lib/db";
import { getEffectiveStatus, fatiaAprovadosPorConta } from "@/lib/distribution";
import { getAtividadeHoje } from "@/lib/team-activity";
import { getRelatorioAtendente, diaValido } from "@/lib/operator-report";
import { brDateString } from "@/lib/date-br";
import { TeamActivityTable } from "@/components/team-activity-table";
import { OperatorReport } from "@/components/operator-report";
import { OperatorReportControls } from "@/components/operator-report-controls";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtShare } from "@/lib/utils";
import { OperatorRow } from "./operator-row";
import { AttendanceGroups } from "@/components/attendance-groups";
import { updateProductAccess } from "@/app/dashboard/produtores/actions";
import {
  approveOperator,
  rejectOperator,
  removeOperator,
  reactivateOperator,
  updateDistribution,
  updateIdleTimeout,
  createGroup,
  updateGroup,
  removeGroup,
} from "./actions";
import { IdleTimeoutCard } from "@/components/idle-timeout-card";

export const dynamic = "force-dynamic";

/**
 * Como as vendas aprovadas se repartem entre os grupos. Sem individuais na
 * disputa, a % de cada grupo vale em relação às dos outros: três grupos de 20%
 * ficam com um terço cada, não com 20% e 40% sem dono.
 */
function resumoAprovados(
  groups: { name: string; weightApproved: number; active: boolean; memberCount: number }[]
) {
  const disputando = groups.filter((g) => g.active && g.memberCount > 0 && g.weightApproved > 0);
  const soma = disputando.reduce((s, g) => s + g.weightApproved, 0);

  if (disputando.length === 0) {
    return (
      <span className="text-danger">
        Nenhum grupo ativo com contas: as <strong>vendas aprovadas ficam em
        espera</strong>, porque só grupo recebe lead pago.
      </span>
    );
  }

  return (
    <span>
      <strong>Aprovados</strong> (só grupos):{" "}
      {disputando.map((g, i) => (
        <span key={g.name}>
          {i > 0 && " · "}
          {g.name}{" "}
          <span className="font-mono font-semibold text-primary">
            {fmtShare((g.weightApproved / soma) * 100)}
          </span>
        </span>
      ))}
    </span>
  );
}

export default async function OperadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ atendente?: string; dia?: string; ver?: string }>;
}) {
  const { atendente, dia: diaParam, ver } = await searchParams;
  const [operators, pending, rejected, deactivated, products, productAccesses, groups] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: "OPERATOR", approvalStatus: "APPROVED", active: true },
        include: { distributionRule: true, groups: true },
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
        include: { members: { select: { id: true } } },
      }),
    ]);

  const atividade = await getAtividadeHoje();

  // Relatório por atendente: aba selecionada (padrão = 1º da lista) e dia
  // (padrão = hoje). Busca só o do selecionado — um atendente por vez é barato.
  const hoje = brDateString(new Date());
  const dia = diaValido(diaParam);
  const relatorioAberto = ver === "1";
  const selecionado =
    atendente && operators.some((o) => o.id === atendente)
      ? atendente
      : operators[0]?.id ?? null;
  // Só consulta o banco quando o painel está aberto — fechado, nem busca.
  const relatorio =
    relatorioAberto && selecionado ? await getRelatorioAtendente(selecionado, dia) : null;

  // Fatia esperada nas vendas: a % de cada grupo em relação às dos outros,
  // repartida entre as contas dele. Quem está em mais de um grupo soma as duas.
  // Considera todo mundo disponível, e não só quem está online agora, pra a
  // tabela não ficar dançando a cada refresh.
  const fatiasAprovado = fatiaAprovadosPorConta(groups);
  const shareDaConta = (op: { id: string }): number | null => fatiasAprovado.get(op.id) ?? null;

  const noRodizio = operators.filter((op) => op.distributionRule?.active).length;

  const groupsForUi = groups.map((g) => ({
    id: g.id,
    name: g.name,
    weightApproved: g.weightApproved,
    active: g.active,
    memberCount: g.members.length,
    memberIds: g.members.map((m) => m.id),
  }));
  const operatorsForGroups = operators.map((op) => ({ id: op.id, name: op.name }));
  const operatorsIdle = operators.map((op) => ({
    id: op.id,
    name: op.name,
    idleTimeoutMinutes: op.idleTimeoutMinutes,
  }));

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

      <TeamActivityTable atividade={atividade} />

      <OperatorReport
        operadores={operatorsForGroups}
        selecionado={selecionado}
        dia={dia}
        hoje={hoje}
        aberto={relatorioAberto}
        relatorio={relatorio}
        controls={
          selecionado ? (
            <OperatorReportControls atendente={selecionado} dia={dia} hoje={hoje} />
          ) : null
        }
      />

      <IdleTimeoutCard operadores={operatorsIdle} salvar={updateIdleTimeout} />

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
          <strong>Venda aprovada só vai pra grupo de atendimento</strong>, na
          proporção da % de cada um. Quem não está em grupo não recebe lead
          pago.
          <br />
          <strong>Pendentes e recusados</strong> vão pelo rodízio, com a equipe
          toda junto — inclusive quem está em grupo. O rodízio premia quem
          trabalha: o próximo lead vai pra quem tem a menor fila em aberto no
          dia, então quem zera volta pro topo e quem acumula sai da roda até dar
          conta. Em ambos os casos vale só pra quem está online e não está
          ocioso há mais de 15 minutos.
        </p>
        <p className="mb-4 text-xs text-secondary">
          Quem recebe o quê é decidido no botão <strong>Produtos</strong> de cada
          atendente: só recebe leads de um produtor quem estiver marcado nele.
          O rodízio e a % do grupo valem apenas entre os liberados pra aquele
          lead. Vale pra aprovado, pendente <strong>e recusado</strong>: como
          recusado não tem caixinha própria, quem estiver marcado no produtor
          (em Aprovados ou Pendentes) recebe também os recusados dele — quem não
          está marcado em nada não recebe nada daquele produtor.
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
                  op.groups.length > 0 || op.distributionRule?.active
                    ? {
                        approved: shareDaConta(op),
                        // Vários grupos cabem numa conta só; o nome de todos
                        // aparece pra você saber de onde vem a fatia.
                        groupName:
                          op.groups.length > 0 ? op.groups.map((g) => g.name).join(" + ") : null,
                      }
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
            {resumoAprovados(groupsForUi)}
            <span className="text-muted">
              <strong>Pendentes e recusados</strong>: rodízio entre toda a equipe
              liberada ({noRodizio} conta{noRodizio === 1 ? "" : "s"}), incluindo
              quem está em grupo.
            </span>
            <span className="mt-1 text-muted">
              As fatias consideram todo mundo disponível. Quando alguém sai ou
              fica ocioso, a parte dele é redividida na hora entre os que ficaram.
            </span>
          </div>
        )}
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
