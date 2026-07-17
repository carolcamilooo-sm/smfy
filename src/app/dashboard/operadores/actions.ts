"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";

export async function approveOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));

  await prisma.user.update({
    where: { id: operatorId },
    data: { approvalStatus: "APPROVED" },
  });

  await prisma.distributionRule.upsert({
    where: { operatorId },
    update: {},
    create: {
      operatorId,
      weightApproved: 1,
      weightPending: 1,
      weightDeclined: 1,
      active: true,
    },
  });

  revalidatePath("/dashboard/operadores");
}

export async function rejectOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));

  await prisma.user.update({
    where: { id: operatorId },
    data: { approvalStatus: "REJECTED" },
  });

  revalidatePath("/dashboard/operadores");
}

/**
 * Operators with lead history can't be hard-deleted (leads and lead events
 * reference them for reporting), so they're deactivated instead: hidden
 * from the active roster and blocked from logging in, but past leads stay
 * intact. Only operators with zero history are actually erased.
 */
export async function removeOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  const [assignedLeadCount, leadEventCount] = await Promise.all([
    prisma.lead.count({ where: { assignedOperatorId: operatorId } }),
    prisma.leadEvent.count({ where: { operatorId } }),
  ]);

  if (assignedLeadCount === 0 && leadEventCount === 0) {
    await prisma.user.delete({ where: { id: operatorId, role: "OPERATOR" } });
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: operatorId }, data: { active: false } }),
      prisma.distributionRule.updateMany({ where: { operatorId }, data: { active: false } }),
    ]);
  }

  revalidatePath("/dashboard/operadores");
}

export async function reactivateOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  await prisma.user.update({ where: { id: operatorId }, data: { active: true } });

  revalidatePath("/dashboard/operadores");
}

function clampPercent(value: FormDataEntryValue | null) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

export async function updateDistribution(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  const weightApproved = clampPercent(formData.get("weightApproved"));
  const weightPending = clampPercent(formData.get("weightPending"));
  const weightDeclined = clampPercent(formData.get("weightDeclined"));
  const active = formData.get("active") === "on";
  const userActive = formData.get("userActive") === "on";
  const priority = formData.get("priority") === "on";

  await prisma.$transaction([
    prisma.distributionRule.upsert({
      where: { operatorId },
      update: { weightApproved, weightPending, weightDeclined, active },
      create: { operatorId, weightApproved, weightPending, weightDeclined, active },
    }),
    prisma.user.update({
      where: { id: operatorId },
      data: { active: userActive, priority },
    }),
  ]);

  revalidatePath("/dashboard/operadores");
}

export async function createGroup(formData: FormData) {
  await requireDashboardAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.attendanceGroup.create({ data: { name } });
  revalidatePath("/dashboard/operadores");
}

export async function updateGroup(formData: FormData) {
  await requireDashboardAccess();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  // Contas marcadas neste grupo. Uma conta só pode estar num grupo: marcar aqui
  // migra de qualquer outro; desmarcar uma que era deste grupo volta pra
  // individual. Contas de outros grupos não são tocadas.
  const memberIds = formData.getAll("member").map(String);

  await prisma.$transaction([
    prisma.attendanceGroup.update({
      where: { id },
      data: {
        name,
        weightApproved: clampPercent(formData.get("weightApproved")),
        weightPending: clampPercent(formData.get("weightPending")),
        weightDeclined: clampPercent(formData.get("weightDeclined")),
        active: formData.get("active") === "on",
      },
    }),
    prisma.user.updateMany({
      where: { id: { in: memberIds } },
      data: { groupId: id },
    }),
    prisma.user.updateMany({
      where: { groupId: id, id: { notIn: memberIds } },
      data: { groupId: null },
    }),
  ]);
  revalidatePath("/dashboard/operadores");
}

export async function removeGroup(formData: FormData) {
  await requireDashboardAccess();
  const id = String(formData.get("id"));
  // onDelete: SetNull no schema devolve as contas ao modo individual.
  await prisma.attendanceGroup.delete({ where: { id } });
  revalidatePath("/dashboard/operadores");
}
