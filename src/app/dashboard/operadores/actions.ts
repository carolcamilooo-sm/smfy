"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";

/**
 * Admin-initiated version of the /cadastro self-signup: skips the
 * PENDING approval step since the admin is vouching for the account
 * directly, and sets up a default distribution rule right away so the
 * operator can start receiving leads without a second manual step.
 */
export async function createOperator(formData: FormData) {
  await requireDashboardAccess();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    throw new Error("Preencha nome, e-mail e uma senha com 6+ caracteres.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Já existe uma conta com este e-mail.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const operator = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "OPERATOR",
      approvalStatus: "APPROVED",
    },
  });

  await prisma.distributionRule.create({
    data: {
      operatorId: operator.id,
      weightApproved: 0,
      weightPending: 0,
      weightDeclined: 0,
      active: true,
    },
  });

  revalidatePath("/dashboard/operadores");
}

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
