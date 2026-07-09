import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getOperatorData(operatorId: string) {
  const todayStart = startOfToday();

  const [user, queue, templates, attendedToday] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: operatorId } }),
    prisma.lead.findMany({
      where: { assignedOperatorId: operatorId, serviceStatus: "ASSIGNED" },
      orderBy: { assignedAt: "asc" },
    }),
    prisma.messageTemplate.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
    }),
    prisma.leadEvent.count({
      where: {
        operatorId,
        action: "ATTENDED",
        createdAt: { gte: todayStart },
      },
    }),
  ]);

  return {
    status: user.status,
    queue: queue.map((lead) => ({ ...lead, value: lead.value ? Number(lead.value) : null })),
    templates,
    attendedToday,
  };
}

export async function getDashboardData() {
  const todayStart = startOfToday();

  const [leadsToday, operators, recentLeads, attendedByOperator] =
    await Promise.all([
      prisma.lead.findMany({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.findMany({
        where: { role: "OPERATOR" },
        include: { distributionRule: true },
        orderBy: { name: "asc" },
      }),
      prisma.lead.findMany({
        where: { createdAt: { gte: todayStart } },
        include: {
          assignedOperator: { select: { name: true } },
          producer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.leadEvent.groupBy({
        by: ["operatorId"],
        where: { action: "ATTENDED", createdAt: { gte: todayStart } },
        _count: { _all: true },
      }),
    ]);

  const attendedMap = new Map(
    attendedByOperator.map((a) => [a.operatorId, a._count._all])
  );

  const stats = {
    total: leadsToday.length,
    approved: leadsToday.filter((l) => l.paymentStatus === "APPROVED").length,
    pending: leadsToday.filter((l) => l.paymentStatus === "PENDING").length,
    waiting: leadsToday.filter(
      (l) => l.serviceStatus === "WAITING" || l.serviceStatus === "ASSIGNED"
    ).length,
  };

  const operatorSummaries = operators.map((op) => ({
    id: op.id,
    name: op.name,
    email: op.email,
    effectiveStatus: getEffectiveStatus(op),
    weight: op.distributionRule?.weight ?? 0,
    active: op.distributionRule?.active ?? false,
    attendedToday: attendedMap.get(op.id) ?? 0,
  }));

  const leads = recentLeads.map((lead) => ({
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  }));

  return { stats, operatorSummaries, leads };
}
