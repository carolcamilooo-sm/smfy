import { prisma } from "@/lib/db";
import type { Lead, User } from "@/generated/prisma/client";

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

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Picks the eligible operator whose today-assigned/weight ratio is lowest,
 * so leads converge on the proportions the admin configured even though
 * each invocation is stateless (serverless-safe weighted round robin).
 */
export async function pickOperatorForLead(): Promise<User | null> {
  const operators = await prisma.user.findMany({
    where: {
      role: "OPERATOR",
      status: "ONLINE",
      distributionRule: { active: true, weight: { gt: 0 } },
    },
    include: { distributionRule: true },
  });

  const eligible = operators.filter(
    (op) => getEffectiveStatus(op) === "ONLINE"
  );
  if (eligible.length === 0) return null;

  const todayStart = startOfToday();
  const counts = await prisma.lead.groupBy({
    by: ["assignedOperatorId"],
    where: {
      assignedOperatorId: { in: eligible.map((op) => op.id) },
      assignedAt: { gte: todayStart },
    },
    _count: { _all: true },
  });
  const countMap = new Map(
    counts.map((c) => [c.assignedOperatorId as string, c._count._all])
  );

  let chosen = eligible[0];
  let bestRatio = Infinity;
  for (const op of eligible) {
    const weight = op.distributionRule?.weight ?? 1;
    const assignedToday = countMap.get(op.id) ?? 0;
    const ratio = assignedToday / weight;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      chosen = op;
    }
  }
  return chosen;
}

export async function assignLead(lead: Lead): Promise<Lead> {
  const operator = await pickOperatorForLead();

  if (!operator) {
    return prisma.lead.update({
      where: { id: lead.id },
      data: { serviceStatus: "WAITING" },
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
    const operator = await pickOperatorForLead();
    if (!operator) break;
    await assignLead(lead);
  }
}
