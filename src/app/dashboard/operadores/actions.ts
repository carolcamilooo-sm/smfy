"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("unauthorized");
  }
}

export async function approveOperator(formData: FormData) {
  await requireAdmin();

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
  await requireAdmin();

  const operatorId = String(formData.get("operatorId"));

  await prisma.user.update({
    where: { id: operatorId },
    data: { approvalStatus: "REJECTED" },
  });

  revalidatePath("/dashboard/operadores");
}

function clampPercent(value: FormDataEntryValue | null) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

export async function updateDistribution(formData: FormData) {
  await requireAdmin();

  const operatorId = String(formData.get("operatorId"));
  const weightApproved = clampPercent(formData.get("weightApproved"));
  const weightPending = clampPercent(formData.get("weightPending"));
  const weightDeclined = clampPercent(formData.get("weightDeclined"));
  const active = formData.get("active") === "on";

  await prisma.distributionRule.upsert({
    where: { operatorId },
    update: { weightApproved, weightPending, weightDeclined, active },
    create: { operatorId, weightApproved, weightPending, weightDeclined, active },
  });

  revalidatePath("/dashboard/operadores");
}
