import { prisma } from "@/lib/db";
import type { Lead, PaymentStatus, User } from "@/generated/prisma/client";

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

export type DistributionCategory = "approved" | "pending" | "declined";

/** Leads without a dedicated bucket (OTHER) fall back to "pending". */
export function categoryForPaymentStatus(status: PaymentStatus): DistributionCategory {
  if (status === "APPROVED") return "approved";
  if (status === "DECLINED") return "declined";
  return "pending";
}

function weightForCategory(
  rule: { weightApproved: number; weightPending: number; weightDeclined: number } | null | undefined,
  category: DistributionCategory
): number {
  if (!rule) return 1;
  if (category === "approved") return rule.weightApproved;
  if (category === "declined") return rule.weightDeclined;
  return rule.weightPending;
}

function distributionRuleFilterForCategory(category: DistributionCategory) {
  if (category === "approved") return { active: true, weightApproved: { gt: 0 } };
  if (category === "declined") return { active: true, weightDeclined: { gt: 0 } };
  return { active: true, weightPending: { gt: 0 } };
}

function paymentStatusesForCategory(category: DistributionCategory): PaymentStatus[] {
  if (category === "approved") return ["APPROVED"];
  if (category === "declined") return ["DECLINED"];
  return ["PENDING", "OTHER"];
}

/**
 * If a product has any explicit ProductAccess grants for this category,
 * only the granted operators are eligible — otherwise every operator is
 * (backward compatible: a product nobody configured behaves like before).
 * Declined/"carrinho" leads aren't gated by product, only approved/pending.
 */
async function allowedOperatorIdsForProduct(
  productId: string | null | undefined,
  category: DistributionCategory
): Promise<Set<string> | null> {
  if (!productId || category === "declined") return null;

  const grants = await prisma.productAccess.findMany({
    where: {
      productId,
      ...(category === "approved" ? { allowApproved: true } : { allowPending: true }),
    },
    select: { operatorId: true },
  });
  if (grants.length === 0) return null;
  return new Set(grants.map((g) => g.operatorId));
}

/**
 * Picks the eligible operator whose today-assigned/weight ratio is lowest
 * *within the lead's payment category*, so each category (Aprovados/
 * Pendentes/Carrinhos) converges independently on the proportions the admin
 * configured, even though each invocation is stateless (serverless-safe
 * weighted round robin). Operators marked "priority" are always preferred
 * over non-priority ones when both are eligible.
 */
export async function pickOperatorForLead(
  paymentStatus: PaymentStatus,
  productId?: string | null
): Promise<User | null> {
  const category = categoryForPaymentStatus(paymentStatus);
  const allowedIds = await allowedOperatorIdsForProduct(productId, category);

  const operators = await prisma.user.findMany({
    where: {
      role: "OPERATOR",
      status: "ONLINE",
      active: true,
      ...(allowedIds ? { id: { in: Array.from(allowedIds) } } : {}),
      distributionRule: distributionRuleFilterForCategory(category),
    },
    include: { distributionRule: true },
  });

  let eligible = operators.filter((op) => getEffectiveStatus(op) === "ONLINE");
  if (eligible.length === 0) return null;

  const priorityEligible = eligible.filter((op) => op.priority);
  if (priorityEligible.length > 0) eligible = priorityEligible;

  const todayStart = startOfToday();
  const counts = await prisma.lead.groupBy({
    by: ["assignedOperatorId"],
    where: {
      assignedOperatorId: { in: eligible.map((op) => op.id) },
      assignedAt: { gte: todayStart },
      paymentStatus: { in: paymentStatusesForCategory(category) },
    },
    _count: { _all: true },
  });
  const countMap = new Map(
    counts.map((c) => [c.assignedOperatorId as string, c._count._all])
  );

  let chosen = eligible[0];
  let bestRatio = Infinity;
  for (const op of eligible) {
    const weight = weightForCategory(op.distributionRule, category);
    const assignedToday = countMap.get(op.id) ?? 0;
    const ratio = assignedToday / weight;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      chosen = op;
    }
  }
  return chosen;
}

export async function assignLead(
  lead: Lead
): Promise<Lead & { assignedOperator: { name: string } | null }> {
  const operator = await pickOperatorForLead(lead.paymentStatus, lead.productId);

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
    const operator = await pickOperatorForLead(lead.paymentStatus, lead.productId);
    if (!operator) break;
    await assignLead(lead);
  }
}
