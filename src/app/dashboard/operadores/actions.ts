"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("unauthorized");
  }
}

export async function createOperator(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    throw new Error("Preencha nome, e-mail e uma senha com 6+ caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "OPERATOR",
      distributionRule: { create: { weight: 1, active: true } },
    },
  });

  revalidatePath("/dashboard/operadores");
}

export async function updateDistribution(formData: FormData) {
  await requireAdmin();

  const operatorId = String(formData.get("operatorId"));
  const weight = Number(formData.get("weight"));
  const active = formData.get("active") === "on";

  await prisma.distributionRule.upsert({
    where: { operatorId },
    update: { weight, active },
    create: { operatorId, weight, active },
  });

  revalidatePath("/dashboard/operadores");
}
