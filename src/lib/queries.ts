import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";
import type { Prisma } from "@/generated/prisma/client";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export type DateRangeParams = { period?: string; from?: string; to?: string };
export type DateRange = { from: Date; to: Date; bucket: "hour" | "day"; period: string };

export function resolveDateRange(params: DateRangeParams): DateRange {
  const period = params.period ?? "today";
  const now = new Date();

  if (period === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y), bucket: "hour", period };
  }
  if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diffToMonday);
    return { from: startOfDay(monday), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: startOfDay(from), to: endOfDay(now), bucket: "day", period };
  }
  if (period === "custom" && params.from && params.to) {
    const from = startOfDay(new Date(`${params.from}T00:00:00`));
    const to = endOfDay(new Date(`${params.to}T00:00:00`));
    const singleDay = params.from === params.to;
    return { from, to, bucket: singleDay ? "hour" : "day", period };
  }

  return { from: startOfDay(now), to: endOfDay(now), bucket: "hour", period: "today" };
}

function bucketLabel(date: Date, bucket: "hour" | "day"): string {
  if (bucket === "hour") {
    return `${String(date.getHours()).padStart(2, "0")}h`;
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
    const cursor = startOfDay(range.from);
    const last = startOfDay(range.to);
    while (cursor <= last) {
      counts.set(bucketLabel(cursor, "day"), 0);
      cursor.setDate(cursor.getDate() + 1);
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

  const [user, queue, templates, attendedToday, receivedToday, attendedLeadsToday] =
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
      prisma.lead.findMany({
        where: {
          assignedOperatorId: operatorId,
          serviceStatus: "ATTENDED",
          attendedAt: { gte: todayStart },
        },
        select: { assignedAt: true, attendedAt: true },
      }),
    ]);

  const responseTimes = attendedLeadsToday
    .filter((l) => l.assignedAt && l.attendedAt)
    .map((l) => (l.attendedAt!.getTime() - l.assignedAt!.getTime()) / 1000);
  const avgFirstResponseSeconds =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, s) => sum + s, 0) / responseTimes.length)
      : null;

  return {
    status: user.status,
    queue: queue.map((lead) => ({ ...lead, value: lead.value ? Number(lead.value) : null })),
    templates,
    attendedToday,
    receivedToday,
    avgFirstResponseSeconds,
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
        where: { createdAt: { gte: range.from, lte: range.to } },
        include: {
          assignedOperator: { select: { name: true } },
          producer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
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

  const stats = {
    total: leadsInRange.length,
    approved: summarizeGroup(leadsInRange.filter((l) => l.paymentStatus === "APPROVED")),
    pending: summarizeGroup(leadsInRange.filter((l) => l.paymentStatus === "PENDING")),
    declined: summarizeGroup(leadsInRange.filter((l) => l.paymentStatus === "DECLINED")),
  };

  const volume = buildVolumeBuckets(leadsInRange, range);

  const operatorSummaries = operators.map((op) => ({
    id: op.id,
    name: op.name,
    email: op.email,
    effectiveStatus: getEffectiveStatus(op),
    weightApproved: op.distributionRule?.weightApproved ?? 0,
    active: op.distributionRule?.active ?? false,
    attendedInRange: attendedMap.get(op.id) ?? 0,
  }));

  const leads = recentLeads.map((lead) => ({
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  }));

  return { range, stats, volume, operatorSummaries, leads };
}

export async function getOperatorHistory(
  operatorId: string,
  params: DateRangeParams & { q?: string }
) {
  const range = resolveDateRange(params);
  const q = params.q?.trim();

  const where: Prisma.LeadWhereInput = {
    assignedOperatorId: operatorId,
    serviceStatus: "ATTENDED",
    attendedAt: { gte: range.from, lte: range.to },
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
  const d = startOfDay(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  return d;
}

export async function getOperatorPerformance(operatorId: string, params: DateRangeParams) {
  const range = resolveDateRange(params);
  const durationMs = range.to.getTime() - range.from.getTime();
  const previousTo = new Date(range.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfDay(new Date());

  const sevenDaysAgo = startOfDay(new Date());
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

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
  const cursor = new Date(sevenDaysAgo);
  const keys: number[] = [];
  for (let i = 0; i < 7; i++) {
    const key = localDayKey(cursor);
    dailyCounts.set(key, 0);
    keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
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
      label: isToday ? "Hoje" : WEEKDAY_LABELS[date.getDay()],
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
  params: Pick<LeadsHistoryParams, "q" | "status" | "producerId">,
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

export type LeadsExportParams = DateRangeParams & {
  q?: string;
  status?: LeadsSaleStatus;
  producerId?: string;
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
      where: { createdAt: { gte: range.from, lte: range.to } },
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.operatorId, c._count._all]));
  const ranking = operators
    .map((op) => ({ operatorId: op.id, name: op.name, count: countMap.get(op.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { range, ranking };
}
