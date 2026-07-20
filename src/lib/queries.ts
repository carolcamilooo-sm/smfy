import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";
import type { Prisma } from "@/generated/prisma/client";
import {
  brDateString,
  brHour,
  brWeekday,
  endOfDay,
  endOfDayString,
  shiftDateString,
  startOfDay,
  startOfDayString,
  startOfToday,
} from "@/lib/date-br";

export type DateRangeParams = { period?: string; from?: string; to?: string };
export type DateRange = { from: Date; to: Date; bucket: "hour" | "day"; period: string };

export function resolveDateRange(params: DateRangeParams): DateRange {
  const period = params.period ?? "today";
  const now = new Date();
  const todayStr = brDateString(now);

  if (period === "yesterday") {
    const y = shiftDateString(todayStr, -1);
    return { from: startOfDayString(y), to: endOfDayString(y), bucket: "hour", period };
  }
  if (period === "week") {
    const weekday = brWeekday(now);
    const diffToMonday = weekday === 0 ? 6 : weekday - 1;
    const monday = shiftDateString(todayStr, -diffToMonday);
    return { from: startOfDayString(monday), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "3d") {
    const from = shiftDateString(todayStr, -2);
    return { from: startOfDayString(from), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "7d") {
    const from = shiftDateString(todayStr, -6);
    return { from: startOfDayString(from), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "month") {
    const from = `${todayStr.slice(0, 7)}-01`;
    return { from: startOfDayString(from), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "custom" && params.from && params.to) {
    const singleDay = params.from === params.to;
    return {
      from: startOfDayString(params.from),
      to: endOfDayString(params.to),
      bucket: singleDay ? "hour" : "day",
      period,
    };
  }

  return { from: startOfDayString(todayStr), to: endOfDayString(todayStr), bucket: "hour", period: "today" };
}

function bucketLabel(date: Date, bucket: "hour" | "day"): string {
  if (bucket === "hour") {
    return `${String(brHour(date)).padStart(2, "0")}h`;
  }
  const [, month, day] = brDateString(date).split("-");
  return `${day}/${month}`;
}

function buildVolumeBuckets(
  leads: { createdAt: Date }[],
  range: DateRange
): { label: string; count: number }[] {
  const counts = new Map<string, number>();

  if (range.bucket === "hour") {
    for (let h = 0; h < 24; h++) {
      counts.set(`${String(h).padStart(2, "0")}h`, 0);
    }
  } else {
    let cursor = startOfDay(range.from);
    const last = startOfDay(range.to);
    while (cursor <= last) {
      counts.set(bucketLabel(cursor, "day"), 0);
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  for (const lead of leads) {
    const label = bucketLabel(lead.createdAt, range.bucket);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

export async function getOperatorData(operatorId: string) {
  const todayStart = startOfToday();

  const [user, queue, templates, attendedToday, receivedToday] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: operatorId } }),
      prisma.lead.findMany({
        where: { assignedOperatorId: operatorId, serviceStatus: "ASSIGNED" },
        include: { producer: { select: { name: true } } },
        orderBy: { assignedAt: "asc" },
      }),
      prisma.messageTemplate.findMany({
        where: { active: true, operatorId },
        orderBy: { title: "asc" },
      }),
      prisma.leadEvent.count({
        where: {
          operatorId,
          action: "ATTENDED",
          createdAt: { gte: todayStart },
        },
      }),
      prisma.lead.count({
        where: { assignedOperatorId: operatorId, assignedAt: { gte: todayStart } },
      }),
    ]);

  return {
    status: user.status,
    queue: queue.map((lead) => ({ ...lead, value: lead.value ? Number(lead.value) : null })),
    templates,
    attendedToday,
    receivedToday,
    hasAttendWebhook: Boolean(user.attendWebhookUrl),
  };
}

function summarizeGroup(leads: { serviceStatus: string }[]) {
  const total = leads.length;
  const attended = leads.filter((l) => l.serviceStatus === "ATTENDED").length;
  return { total, attended, remaining: total - attended };
}

export async function getDashboardData(rangeParams: DateRangeParams = {}) {
  const range = resolveDateRange(rangeParams);

  const [leadsInRange, operators, recentLeads, attendedByOperator] =
    await Promise.all([
      prisma.lead.findMany({
        where: { createdAt: { gte: range.from, lte: range.to } },
      }),
      prisma.user.findMany({
        where: { role: "OPERATOR" },
        include: { distributionRule: true },
        orderBy: { name: "asc" },
      }),
      prisma.lead.findMany({
        // Always "hoje" (Brasília), independent of the period filter above —
        // once the day rolls over, yesterday's leads belong in Histórico only.
        where: { createdAt: { gte: startOfToday(), lte: endOfDay(new Date()) } },
        include: {
          assignedOperator: { select: { name: true } },
          producer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.leadEvent.groupBy({
        by: ["operatorId"],
        where: {
          action: "ATTENDED",
          createdAt: { gte: range.from, lte: range.to },
        },
        _count: { _all: true },
      }),
    ]);

  const attendedMap = new Map(
    attendedByOperator.map((a) => [a.operatorId, a._count._all])
  );

  const producerIds = [
    ...new Set(
      leadsInRange.map((l) => l.producerId).filter((id): id is string => id !== null)
    ),
  ];
  const producerNames = producerIds.length
    ? await prisma.producer.findMany({
        where: { id: { in: producerIds } },
        select: { id: true, name: true },
      })
    : [];
  const producerNameMap = new Map(producerNames.map((p) => [p.id, p.name]));

  const producerCounts = new Map<
    string,
    { producerId: string | null; name: string; approved: number; pending: number; declined: number }
  >();
  for (const lead of leadsInRange) {
    const key = lead.producerId ?? "sem-produtor";
    if (!producerCounts.has(key)) {
      producerCounts.set(key, {
        producerId: lead.producerId,
        name: lead.producerId ? (producerNameMap.get(lead.producerId) ?? "Produtor removido") : "Sem produtor",
        approved: 0,
        pending: 0,
        declined: 0,
      });
    }
    const entry = producerCounts.get(key)!;
    if (lead.paymentStatus === "APPROVED") entry.approved += 1;
    else if (lead.paymentStatus === "PENDING") entry.pending += 1;
    else if (lead.paymentStatus === "DECLINED") entry.declined += 1;
  }

  const producerSummary = [...producerCounts.values()].sort(
    (a, b) => b.approved + b.pending + b.declined - (a.approved + a.pending + a.declined)
  );

  const stats = {
    total: leadsInRange.length,
    approved: summarizeGroup(leadsInRange.filter((l) => l.paymentStatus === "APPROVED")),
    pending: summarizeGroup(leadsInRange.filter((l) => l.paymentStatus === "PENDING")),
    declined: summarizeGroup(leadsInRange.filter((l) => l.paymentStatus === "DECLINED")),
  };

  const volume = buildVolumeBuckets(leadsInRange, range);

  // Quantos leads cada um recebeu de fato no período. Antes esta tela mostrava
  // a % configurada, mas com a distribuição automática não existe mais % por
  // atendente — o que cada um recebe depende do ritmo dele. Então o honesto é
  // mostrar o que aconteceu de verdade, não uma meta.
  const receivedMap = new Map<string, number>();
  for (const lead of leadsInRange) {
    if (!lead.assignedOperatorId) continue;
    receivedMap.set(lead.assignedOperatorId, (receivedMap.get(lead.assignedOperatorId) ?? 0) + 1);
  }
  const totalAssignedInRange = [...receivedMap.values()].reduce((a, b) => a + b, 0);

  const operatorSummaries = operators.map((op) => ({
    id: op.id,
    name: op.name,
    email: op.email,
    effectiveStatus: getEffectiveStatus(op),
    receivedInRange: receivedMap.get(op.id) ?? 0,
    shareOfReceived:
      totalAssignedInRange > 0 ? ((receivedMap.get(op.id) ?? 0) / totalAssignedInRange) * 100 : 0,
    active: op.distributionRule?.active ?? false,
    attendedInRange: attendedMap.get(op.id) ?? 0,
  }));

  const leads = recentLeads.map((lead) => ({
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  }));

  return { range, stats, volume, operatorSummaries, leads, producerSummary };
}

/** Quantos dias o Histórico do atendente enxerga, contando hoje. */
export const OPERATOR_HISTORY_DAYS = 3;

/** Início do dia mais antigo que o atendente pode ver, em Brasília. */
function OPERATOR_HISTORY_FLOOR(): Date {
  return startOfDayString(
    shiftDateString(brDateString(new Date()), -(OPERATOR_HISTORY_DAYS - 1))
  );
}

export async function getOperatorHistory(
  operatorId: string,
  params: DateRangeParams & { q?: string }
) {
  const range = resolveDateRange(params);
  const q = params.q?.trim();

  // Teto rígido de 3 dias: nada mais antigo aparece aqui, nem via ?period= na
  // URL. Os leads seguem no banco e continuam visíveis pro admin em
  // /dashboard/historico — o limite é só desta tela.
  const from = range.from < OPERATOR_HISTORY_FLOOR() ? OPERATOR_HISTORY_FLOOR() : range.from;

  const where: Prisma.LeadWhereInput = {
    assignedOperatorId: operatorId,
    serviceStatus: "ATTENDED",
    attendedAt: { gte: from, lte: range.to },
  };

  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { product: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      producer: { select: { name: true } },
      usedTemplate: { select: { title: true, content: true } },
    },
    orderBy: { attendedAt: "desc" },
    take: 50,
  });

  return {
    range,
    leads: leads.map((lead) => ({
      ...lead,
      value: lead.value ? Number(lead.value) : null,
      responseSeconds:
        lead.assignedAt && lead.attendedAt
          ? Math.round((lead.attendedAt.getTime() - lead.assignedAt.getTime()) / 1000)
          : null,
    })),
  };
}

const RESPONSE_TARGET_SECONDS = 40;
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function localDayKey(date: Date): number {
  return startOfDay(date).getTime();
}

function startOfWeek(date: Date): Date {
  const weekday = brWeekday(date);
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;
  return startOfDayString(shiftDateString(brDateString(date), -diffToMonday));
}

export async function getOperatorPerformance(operatorId: string, params: DateRangeParams) {
  const range = resolveDateRange(params);
  const durationMs = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfDay(new Date());

  const sevenDaysAgo = startOfDayString(shiftDateString(brDateString(new Date()), -6));

  const [
    attendedLeads,
    previousAttendedCount,
    operators,
    operatorAttendedInRange,
    dailyLeads,
    weeklyAttended,
  ] = await Promise.all([
    prisma.lead.findMany({
      where: {
        assignedOperatorId: operatorId,
        serviceStatus: "ATTENDED",
        attendedAt: { gte: range.from, lte: range.to },
      },
      select: { paymentStatus: true, assignedAt: true, attendedAt: true },
    }),
    prisma.lead.count({
      where: {
        assignedOperatorId: operatorId,
        serviceStatus: "ATTENDED",
        attendedAt: { gte: previousFrom, lte: previousTo },
      },
    }),
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "APPROVED" },
      select: { id: true, name: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedOperatorId"],
      where: {
        serviceStatus: "ATTENDED",
        attendedAt: { gte: range.from, lte: range.to },
        assignedOperatorId: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.lead.findMany({
      where: {
        assignedOperatorId: operatorId,
        serviceStatus: "ATTENDED",
        attendedAt: { gte: sevenDaysAgo, lte: endOfDay(new Date()) },
      },
      select: { attendedAt: true },
    }),
    prisma.lead.groupBy({
      by: ["assignedOperatorId"],
      where: {
        serviceStatus: "ATTENDED",
        attendedAt: { gte: weekStart, lte: weekEnd },
        assignedOperatorId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const attended = attendedLeads.length;
  const convertedSales = attendedLeads.filter((l) => l.paymentStatus === "APPROVED").length;
  const conversionRate = attended > 0 ? Math.round((convertedSales / attended) * 100) : 0;

  const responseTimes = attendedLeads
    .filter((l) => l.assignedAt && l.attendedAt)
    .map((l) => (l.attendedAt!.getTime() - l.assignedAt!.getTime()) / 1000);
  const avgFirstResponseSeconds =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, s) => sum + s, 0) / responseTimes.length)
      : null;

  const percentChange =
    previousAttendedCount > 0
      ? Math.round(((attended - previousAttendedCount) / previousAttendedCount) * 100)
      : null;

  const rangeCountMap = new Map(
    operatorAttendedInRange.map((r) => [r.assignedOperatorId as string, r._count._all])
  );
  const rankedOperators = operators
    .map((op) => ({ id: op.id, name: op.name, attended: rangeCountMap.get(op.id) ?? 0 }))
    .sort((a, b) => b.attended - a.attended);
  const rankPosition = rankedOperators.findIndex((op) => op.id === operatorId) + 1;

  const dailyCounts = new Map<number, number>();
  let cursor = new Date(sevenDaysAgo);
  const keys: number[] = [];
  for (let i = 0; i < 7; i++) {
    const key = localDayKey(cursor);
    dailyCounts.set(key, 0);
    keys.push(key);
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  for (const lead of dailyLeads) {
    if (!lead.attendedAt) continue;
    const key = localDayKey(lead.attendedAt);
    if (dailyCounts.has(key)) {
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    }
  }
  const dailySeries = keys.map((key, idx) => {
    const date = new Date(key);
    const isToday = idx === keys.length - 1;
    return {
      label: isToday ? "Hoje" : WEEKDAY_LABELS[brWeekday(date)],
      count: dailyCounts.get(key) ?? 0,
    };
  });

  const weekCountMap = new Map(
    weeklyAttended.map((r) => [r.assignedOperatorId as string, r._count._all])
  );
  const weeklyRanking = operators
    .map((op) => ({
      id: op.id,
      name: op.name,
      attended: weekCountMap.get(op.id) ?? 0,
      isMe: op.id === operatorId,
    }))
    .sort((a, b) => b.attended - a.attended);

  return {
    range,
    attended,
    convertedSales,
    conversionRate,
    avgFirstResponseSeconds,
    responseTargetSeconds: RESPONSE_TARGET_SECONDS,
    percentChange,
    rankPosition,
    totalOperators: operators.length,
    dailySeries,
    weeklyRanking,
  };
}

export async function searchLeads(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const digits = trimmed.replace(/\D/g, "");

  const or: Prisma.LeadWhereInput[] = [
    { customerName: { contains: trimmed, mode: "insensitive" } },
    { email: { contains: trimmed, mode: "insensitive" } },
  ];
  if (digits.length >= 4) {
    or.push({ phone: { contains: digits } });
  }

  const leads = await prisma.lead.findMany({
    where: { OR: or },
    include: {
      assignedOperator: { select: { name: true } },
      producer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return leads.map((lead) => ({
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  }));
}

const HISTORY_PAGE_SIZE = 20;

export type LeadsSaleStatus = "approved" | "pending" | "declined" | "other";

export type LeadsHistoryParams = DateRangeParams & {
  q?: string;
  status?: LeadsSaleStatus;
  producerId?: string;
  /** "none" filtra os que ficaram sem atendente (em espera). */
  operatorId?: string;
  page?: number;
};

const SALE_STATUS_MAP: Record<LeadsSaleStatus, Prisma.LeadWhereInput["paymentStatus"]> = {
  approved: "APPROVED",
  pending: "PENDING",
  declined: "DECLINED",
  other: "OTHER",
};

/** Shared by getLeadsHistory (paginated view) and the CSV export, so both filter identically. */
function buildLeadsHistoryWhere(
  params: Pick<LeadsHistoryParams, "q" | "status" | "producerId" | "operatorId">,
  range: DateRange
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    createdAt: { gte: range.from, lte: range.to },
  };

  if (params.status) {
    where.paymentStatus = SALE_STATUS_MAP[params.status];
  }

  if (params.producerId) {
    where.producerId = params.producerId;
  }

  if (params.operatorId) {
    where.assignedOperatorId = params.operatorId === "none" ? null : params.operatorId;
  }

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { product: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function getLeadsHistory(params: LeadsHistoryParams) {
  const range = resolveDateRange({ period: params.period ?? "7d", from: params.from, to: params.to });
  const page = Math.max(1, params.page ?? 1);
  const where = buildLeadsHistoryWhere(params, range);

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        producer: { select: { name: true } },
        assignedOperator: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
    }),
  ]);

  return {
    range,
    page,
    pageSize: HISTORY_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
    leads: leads.map((lead) => ({
      ...lead,
      value: lead.value ? Number(lead.value) : null,
    })),
  };
}

/**
 * Quantos leads cada atendente recebeu, com os mesmos filtros da tela. Serve
 * pra responder "quanto fulano pegou hoje" sem precisar selecionar um por um.
 *
 * Ignora o filtro de atendente de propósito: selecionar uma pessoa deve
 * destacar a linha dela, e não esconder o resto da equipe — é a comparação que
 * dá sentido ao número.
 */
export async function getLeadsPorAtendente(
  params: Pick<LeadsHistoryParams, "q" | "status" | "producerId" | "period" | "from" | "to">
) {
  const range = resolveDateRange({ period: params.period ?? "7d", from: params.from, to: params.to });
  const where = buildLeadsHistoryWhere({ ...params, operatorId: undefined }, range);

  const [grupos, operadores] = await Promise.all([
    prisma.lead.groupBy({
      by: ["assignedOperatorId"],
      where,
      _count: { _all: true },
    }),
    prisma.user.findMany({ where: { role: "OPERATOR" }, select: { id: true, name: true } }),
  ]);

  const nomes = new Map(operadores.map((o) => [o.id, o.name]));
  const linhas = grupos.map((g) => ({
    operatorId: g.assignedOperatorId,
    name: g.assignedOperatorId
      ? (nomes.get(g.assignedOperatorId) ?? "Atendente removido")
      : "Sem atendente (em espera)",
    count: g._count._all,
  }));

  return { range, linhas: linhas.sort((a, b) => b.count - a.count) };
}

export type LeadsExportParams = DateRangeParams & {
  q?: string;
  status?: LeadsSaleStatus;
  producerId?: string;
  operatorId?: string;
  limit: number;
};

export async function getLeadsForExport(params: LeadsExportParams) {
  const range = resolveDateRange({ period: params.period ?? "7d", from: params.from, to: params.to });
  const where = buildLeadsHistoryWhere(params, range);

  const leads = await prisma.lead.findMany({
    where,
    include: {
      producer: { select: { name: true } },
      assignedOperator: { select: { name: true } },
      usedTemplate: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: params.limit,
  });

  return leads.map((lead) => ({
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  }));
}

/** For "baixar selecionados": exports exactly the checked rows, ignoring the page's other filters. */
export async function getLeadsByIds(ids: string[]) {
  const leads = await prisma.lead.findMany({
    where: { id: { in: ids } },
    include: {
      producer: { select: { name: true } },
      assignedOperator: { select: { name: true } },
      usedTemplate: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return leads.map((lead) => ({
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  }));
}

export type SalesRankingEntry = { operatorId: string; name: string; count: number };

/**
 * Ranking by OperatorSale count (personal webhook conversions), not by the
 * Lead pipeline — sorted desc, ties broken by name so the order is stable.
 */
export async function getSalesRanking(params: DateRangeParams): Promise<{
  range: DateRange;
  ranking: SalesRankingEntry[];
}> {
  const range = resolveDateRange({ period: params.period ?? "today", from: params.from, to: params.to });

  const [operators, counts] = await Promise.all([
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "APPROVED" },
      select: { id: true, name: true },
    }),
    prisma.operatorSale.groupBy({
      by: ["operatorId"],
      where: { createdAt: { gte: range.from, lte: range.to }, paymentStatus: "APPROVED" },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.operatorId, c._count._all]));
  const ranking = operators
    .map((op) => ({ operatorId: op.id, name: op.name, count: countMap.get(op.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { range, ranking };
}
