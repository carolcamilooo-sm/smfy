import { prisma } from "@/lib/db";
import type { Lead, PaymentStatus, User } from "@/generated/prisma/client";
import { startOfToday } from "@/lib/date-br";

export const IDLE_THRESHOLD_MS = 15 * 60 * 1000;

export type EffectiveStatus = "ONLINE" | "IDLE" | "OFFLINE";

export function getEffectiveStatus(user: {
  status: "ONLINE" | "OFFLINE";
  lastActivityAt: Date;
}): EffectiveStatus {
  if (user.status === "OFFLINE") return "OFFLINE";
  const idleFor = Date.now() - user.lastActivityAt.getTime();
  return idleFor < IDLE_THRESHOLD_MS ? "ONLINE" : "IDLE";
}

export type DistributionCategory = "approved" | "pending" | "declined";

/** Leads without a dedicated bucket (OTHER) fall back to "pending". */
export function categoryForPaymentStatus(status: PaymentStatus): DistributionCategory {
  if (status === "APPROVED") return "approved";
  if (status === "DECLINED") return "declined";
  return "pending";
}

export type CategoryWeights = {
  weightApproved: number;
  weightPending: number;
  weightDeclined: number;
} | null | undefined;

export type GroupWeights =
  | ({ active: boolean } & NonNullable<CategoryWeights>)
  | null
  | undefined;

/**
 * O grupo só vale na categoria em que tem % configurada. Um grupo "Top 5" com
 * 60% em aprovados e nada nas outras dá aos 5 uma fatia garantida das vendas,
 * sem tirá-los do rodízio normal de pendentes e recusados — nessas eles contam
 * como conta individual.
 */
export function grupoValeNaCategoria(
  group: GroupWeights,
  category: DistributionCategory
): boolean {
  return Boolean(group?.active) && weightForCategory(group, category) > 0;
}

/**
 * Venda aprovada é só dos grupos: quem não está num grupo com % não recebe
 * lead pago, ponto. O rodízio existe pra pendente e recusado, onde a equipe
 * inteira entra por igual.
 *
 * Consequência que a tela precisa deixar clara: sem nenhum grupo disponível
 * (todos offline, ou nenhum grupo criado), a venda aprovada fica em espera —
 * não cai pro resto da equipe.
 */
export function somenteGrupoRecebe(category: DistributionCategory): boolean {
  return category === "approved";
}

export const DISTRIBUTION_CATEGORIES = ["approved", "pending", "declined"] as const;

export function weightForCategory(rule: CategoryWeights, category: DistributionCategory): number {
  if (!rule) return 1;
  if (category === "approved") return rule.weightApproved;
  if (category === "declined") return rule.weightDeclined;
  return rule.weightPending;
}

export type GrupoDoOperador = { id: string } & NonNullable<GroupWeights>;

/** Um balde disputa o lead com os outros; dentro dele, disputam os membros. */
export type Balde<T> = { chave: string; peso: number; membros: T[] };

/**
 * Monta os baldes que vão disputar este lead.
 *
 * Em aprovados, cada grupo é um balde e o peso é a % dele. Como a mesma pessoa
 * pode estar em vários grupos (um por demanda, por exemplo), ela aparece em
 * mais de um balde — e isso é o esperado: ela concorre pelos dois lados.
 *
 * Nas outras categorias não existe grupo: todo mundo cai num balde só e o
 * rodízio decide, o que dá a divisão igual entre quem está disponível.
 */
export function montarBaldes<T extends { id: string; groups: GrupoDoOperador[] }>(
  disponiveis: T[],
  category: DistributionCategory
): Balde<T>[] {
  if (!somenteGrupoRecebe(category)) {
    return disponiveis.length > 0
      ? [{ chave: "rodizio", peso: 1, membros: disponiveis }]
      : [];
  }

  // Quantos disponíveis cada grupo tem NESTE lead. Um grupo pode aparecer aqui
  // com só uma pessoa: os outros membros não estão liberados neste produtor.
  const disponiveisPorGrupo = new Map<string, number>();
  for (const op of disponiveis) {
    for (const g of op.groups) {
      if (!grupoValeNaCategoria(g, category)) continue;
      disponiveisPorGrupo.set(g.id, (disponiveisPorGrupo.get(g.id) ?? 0) + 1);
    }
  }

  const porGrupo = new Map<string, Balde<T>>();
  for (const op of disponiveis) {
    const candidatos = op.groups.filter((g) => grupoValeNaCategoria(g, category));
    if (candidatos.length === 0) continue;

    // Cada pessoa entra por UM grupo só neste lead: aquele com mais gente
    // disponível aqui — o time que está de fato atendendo esta demanda.
    //
    // Sem isso, quem está em dois grupos levava quase tudo: o grupo onde ele
    // está sozinho soma menos leads que o grupo cheio, e por isso ganharia a
    // vez sempre, num ciclo que não se corrige. Desempate pela maior %, e
    // depois pelo id, pra escolha ser sempre a mesma.
    const escolhido = candidatos.reduce((melhor, g) => {
      const a = disponiveisPorGrupo.get(g.id) ?? 0;
      const b = disponiveisPorGrupo.get(melhor.id) ?? 0;
      if (a !== b) return a > b ? g : melhor;
      const pa = weightForCategory(g, category);
      const pb = weightForCategory(melhor, category);
      if (pa !== pb) return pa > pb ? g : melhor;
      return g.id < melhor.id ? g : melhor;
    });

    const balde =
      porGrupo.get(escolhido.id) ??
      { chave: escolhido.id, peso: weightForCategory(escolhido, category), membros: [] };
    balde.membros.push(op);
    porGrupo.set(escolhido.id, balde);
  }
  return [...porGrupo.values()];
}

/**
 * Fatia esperada de cada conta nas vendas aprovadas, pros painéis. O grupo leva
 * a % dele em relação às dos outros, e reparte entre as próprias contas; quem
 * está em mais de um grupo soma as duas fatias.
 *
 * É uma estimativa de planejamento: considera todo mundo disponível e ignora a
 * trava por produtor, que muda de lead pra lead.
 */
export function fatiaAprovadosPorConta(
  grupos: { id: string; weightApproved: number; active: boolean; members: { id: string }[] }[]
): Map<string, number> {
  const disputando = grupos.filter((g) => g.active && g.weightApproved > 0 && g.members.length > 0);
  const soma = disputando.reduce((s, g) => s + g.weightApproved, 0);
  const fatias = new Map<string, number>();
  if (soma === 0) return fatias;

  for (const g of disputando) {
    const porConta = ((g.weightApproved / soma) * 100) / g.members.length;
    for (const m of g.members) fatias.set(m.id, (fatias.get(m.id) ?? 0) + porConta);
  }
  return fatias;
}

/** Campo de peso da categoria, pra filtrar grupos com peso > 0. */
function weightFieldForCategory(category: DistributionCategory) {
  if (category === "approved") return "weightApproved" as const;
  if (category === "declined") return "weightDeclined" as const;
  return "weightPending" as const;
}

function paymentStatusesForCategory(category: DistributionCategory): PaymentStatus[] {
  if (category === "approved") return ["APPROVED"];
  if (category === "declined") return ["DECLINED"];
  return ["PENDING", "OTHER"];
}

type ProductGrant = { operatorId: string; dailyLimit: number | null };

/**
 * Quem está liberado pra receber este lead: só quem estiver marcado na tela de
 * acesso daquele produtor. Ninguém marcado significa ninguém liberado — o lead
 * fica em espera até alguém ser marcado, e o painel avisa em vermelho quais
 * produtores estão assim. É o contrário do que valia antes (produtor sem
 * marcação liberava pra equipe inteira), e é o contrário mais seguro: falha
 * fechando, sem entregar venda a quem não devia ver.
 *
 * Recusado não passa por essa trava: não existe caixinha de recusados na tela,
 * então gatear por ela deixaria esses leads sem dono nenhum, pra sempre.
 *
 * O casamento é pelo produto quando o lead traz um, e pelo PRODUTOR quando não
 * traz. Esse segundo caso é a regra hoje: os gateways mandam nome de oferta
 * ("3 Mitocondril + 2 Ebooks - OB 2"), que não bate com o nome cadastrado
 * ("ENCAPSULADO GABI-MITOCONDRIL"), então o lead fica sem produto. O produtor,
 * esse sim, vem certo em 100% dos leads — é nele que a trava se apoia.
 */
async function grantsForLead(
  productId: string | null | undefined,
  producerId: string | null | undefined,
  category: DistributionCategory
): Promise<ProductGrant[] | null> {
  if (category === "declined") return null;

  const allow = category === "approved" ? { allowApproved: true } : { allowPending: true };
  const where = productId
    ? { productId, ...allow }
    : producerId
      ? { product: { is: { producerId } }, ...allow }
      : null;
  if (!where) return null;

  const grants = await prisma.productAccess.findMany({
    where,
    select: { operatorId: true, dailyLimitApproved: true, dailyLimitPending: true },
  });
  // Lista vazia é uma resposta, não a ausência dela: ninguém marcado = ninguém
  // liberado. Quem devolve null é só o caso em que a trava não se aplica.
  if (grants.length === 0) return [];

  // Pelo produtor, a mesma pessoa pode aparecer em mais de um produto dele.
  // Fica valendo o limite diário mais apertado — e "sem limite" (null) não
  // apaga um limite que exista noutro produto.
  const byOperator = new Map<string, number | null>();
  for (const g of grants) {
    const limit = category === "approved" ? g.dailyLimitApproved : g.dailyLimitPending;
    if (!byOperator.has(g.operatorId)) {
      byOperator.set(g.operatorId, limit);
      continue;
    }
    const atual = byOperator.get(g.operatorId)!;
    if (atual == null || (limit != null && limit < atual)) byOperator.set(g.operatorId, limit);
  }
  return [...byOperator].map(([operatorId, dailyLimit]) => ({ operatorId, dailyLimit }));
}

/**
 * A escolha em si, separada do banco pra poder ser simulada e testada. São
 * dois níveis, cada um respondendo por uma coisa diferente:
 *
 * 1) Qual balde — cada grupo é um balde, e todas as contas individuais juntas
 *    formam outro. Ganha o de menor razão recebidos-hoje / fatia. É isso que
 *    garante os 20% do grupo, independente de quem trabalha mais ou menos.
 * 2) Quem, dentro do balde — rodízio: ganha quem está há mais tempo sem
 *    receber. Quem acabou de receber vai pro fim da fila, e o ciclo roda um
 *    por vez.
 *
 * O critério é "há quanto tempo não recebe", e não "quantos recebeu hoje", de
 * propósito. Contagem acumulada faz quem está atrás no placar receber centenas
 * seguidos até alcançar os outros — que é justamente o efeito de blocos que se
 * quer evitar. Hora do último lead não tem esse acúmulo: seja qual for o
 * histórico, depois de receber a pessoa cede a vez.
 */
export function chooseByQueue<T extends { id: string }>(
  baldes: Balde<T>[],
  receivedToday: Map<string, number>,
  lastAssigned: Map<string, Date>
): T | null {
  if (baldes.length === 0) return null;

  let escolhido: Balde<T> | null = null;
  let melhorRazao = Infinity;
  for (const b of baldes) {
    // Quem está em dois grupos conta nos dois — o balde fica um pouco mais
    // "servido" do que está, e por isso cede a vez mais cedo. É a aproximação
    // que mantém a conta simples sem privilegiar quem acumula grupos.
    const recebidos = b.membros.reduce((s, m) => s + (receivedToday.get(m.id) ?? 0), 0);
    const razao = b.peso > 0 ? recebidos / b.peso : Infinity;
    if (razao < melhorRazao) {
      melhorRazao = razao;
      escolhido = b;
    }
  }
  // Só cai no fallback se todo balde tiver peso zero, o que a tela avisa.
  const balde = escolhido ?? baldes[0];

  let chosen = balde.membros[0];
  let maisAntigo = Infinity;
  let menosRecebidos = Infinity;
  for (const op of balde.membros) {
    // Quem nunca recebeu (entrou agora, ou não pegou nada hoje) entra na
    // frente: é quem está esperando há mais tempo.
    const quando = lastAssigned.get(op.id)?.getTime() ?? -Infinity;
    const recebidos = receivedToday.get(op.id) ?? 0;
    if (quando < maisAntigo || (quando === maisAntigo && recebidos < menosRecebidos)) {
      maisAntigo = quando;
      menosRecebidos = recebidos;
      chosen = op;
    }
  }
  return chosen;
}

/**
 * Escolhe quem recebe o lead. Monta a lista de elegíveis — online, liberado
 * pelo acesso do produtor, dentro do limite diário — e entrega a decisão pro
 * chooseByQueue. Cada categoria (aprovados, pendentes, recusados) converge
 * sozinha, e nada é guardado entre chamadas: tudo sai de contagens do dia, que
 * é o que funciona num ambiente serverless.
 *
 * Quem está marcado como prioridade passa na frente sempre que estiver
 * elegível.
 */
export async function pickOperatorForLead(
  paymentStatus: PaymentStatus,
  productId?: string | null,
  producerId?: string | null
): Promise<User | null> {
  const category = categoryForPaymentStatus(paymentStatus);
  const grants = await grantsForLead(productId, producerId, category);
  // Produtor sem ninguém marcado: o lead espera, em vez de cair na equipe toda.
  if (grants?.length === 0) return null;
  const allowedIds = grants ? new Set(grants.map((g) => g.operatorId)) : null;

  const weightField = weightFieldForCategory(category);
  const somenteGrupo = somenteGrupoRecebe(category);
  const operators = await prisma.user.findMany({
    where: {
      role: "OPERATOR",
      status: "ONLINE",
      active: true,
      ...(allowedIds ? { id: { in: Array.from(allowedIds) } } : {}),
      // Em aprovados, só quem está em algum grupo com % na categoria. Nas
      // outras, quem está com a distribuição ligada.
      ...(somenteGrupo
        ? { groups: { some: { active: true, [weightField]: { gt: 0 } } } }
        : { distributionRule: { is: { active: true } } }),
    },
    include: { distributionRule: true, groups: true },
  });

  let eligible = operators.filter(
    (op) =>
      getEffectiveStatus(op) === "ONLINE" &&
      (somenteGrupo
        ? op.groups.some((g) => grupoValeNaCategoria(g, category))
        : op.distributionRule?.active === true)
  );
  if (eligible.length === 0) return null;

  const todayStart = startOfToday();

  // Cap filtering happens before the priority narrowing below: an operator
  // who hit their product daily limit must drop out of the whole pool, not
  // just lose to a same-priority-tier rival, so the lead can still fall
  // back to any other liberado operator (priority or not) before WAITING.
  if (grants && (productId || producerId)) {
    const dailyLimitMap = new Map(grants.map((g) => [g.operatorId, g.dailyLimit]));
    const capped = grants.filter((g) => g.dailyLimit != null).map((g) => g.operatorId);
    if (capped.length > 0) {
      const productCounts = await prisma.lead.groupBy({
        by: ["assignedOperatorId"],
        where: {
          assignedOperatorId: { in: eligible.map((op) => op.id).filter((id) => capped.includes(id)) },
          // Conta pelo mesmo critério da trava: por produto quando o lead tem
          // produto, senão pelo produtor. Contar por produto num lead sem
          // produto daria zero sempre, e o limite diário nunca pegaria.
          ...(productId ? { productId } : { producerId }),
          assignedAt: { gte: todayStart },
          paymentStatus: { in: paymentStatusesForCategory(category) },
        },
        _count: { _all: true },
      });
      const productCountMap = new Map(
        productCounts.map((c) => [c.assignedOperatorId as string, c._count._all])
      );
      eligible = eligible.filter((op) => {
        const limit = dailyLimitMap.get(op.id);
        if (limit == null) return true;
        return (productCountMap.get(op.id) ?? 0) < limit;
      });
      if (eligible.length === 0) return null;
    }
  }

  const priorityEligible = eligible.filter((op) => op.priority);
  if (priorityEligible.length > 0) eligible = priorityEligible;

  // Duas coisas da mesma consulta: quantos cada um recebeu hoje (usado pra
  // manter a % dos grupos) e a hora do último lead de cada um (o rodízio).
  const counts = await prisma.lead.groupBy({
    by: ["assignedOperatorId"],
    where: {
      assignedOperatorId: { in: eligible.map((op) => op.id) },
      assignedAt: { gte: todayStart },
      paymentStatus: { in: paymentStatusesForCategory(category) },
    },
    _count: { _all: true },
    _max: { assignedAt: true },
  });
  const countMap = new Map(
    counts.map((c) => [c.assignedOperatorId as string, c._count._all])
  );
  const lastAssignedMap = new Map(
    counts.flatMap((c) =>
      c._max.assignedAt ? [[c.assignedOperatorId as string, c._max.assignedAt] as const] : []
    )
  );

  // Os baldes saem de quem sobrou de verdade (online, com acesso, dentro do
  // limite e do corte por prioridade) — então quem caiu no caminho tem a fatia
  // absorvida pelos que ficaram, e não some da conta.
  return chooseByQueue(montarBaldes(eligible, category), countMap, lastAssignedMap);
}

export async function assignLead(
  lead: Lead
): Promise<Lead & { assignedOperator: { name: string } | null }> {
  const operator = await pickOperatorForLead(lead.paymentStatus, lead.productId, lead.producerId);

  if (!operator) {
    return prisma.lead.update({
      where: { id: lead.id },
      data: { serviceStatus: "WAITING" },
      include: { assignedOperator: { select: { name: true } } },
    });
  }

  const [updatedLead] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        assignedOperatorId: operator.id,
        assignedAt: new Date(),
        serviceStatus: "ASSIGNED",
      },
      include: { assignedOperator: { select: { name: true } } },
    }),
    prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        operatorId: operator.id,
        action: "ASSIGNED",
      },
    }),
  ]);

  return updatedLead;
}

/**
 * Tries to hand out any orphaned WAITING leads, called when an operator
 * comes online or sends a heartbeat so leads don't stay stuck forever.
 */
export async function rescueWaitingLeads(): Promise<void> {
  const waiting = await prisma.lead.findMany({
    where: { serviceStatus: "WAITING" },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  for (const lead of waiting) {
    const operator = await pickOperatorForLead(lead.paymentStatus, lead.productId, lead.producerId);
    if (!operator) break;
    await assignLead(lead);
  }
}
