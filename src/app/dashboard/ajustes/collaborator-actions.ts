"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";

/**
 * Grants dashboard access (Produtores, Equipe de Atendimento, Integrações,
 * Histórico) without the account-owner powers of ADMIN — e.g. this action
 * itself stays ADMIN-only, so a collaborator can't create more collaborators.
 */
export async function createCollaborator(formData: FormData) {
  await requireAdmin();

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

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "COLLABORATOR",
      approvalStatus: "APPROVED",
    },
  });

  revalidatePath("/dashboard/ajustes");
}

export async function removeCollaborator(formData: FormData) {
  await requireAdmin();

  const collaboratorId = String(formData.get("collaboratorId"));
  await prisma.user.delete({ where: { id: collaboratorId, role: "COLLABORATOR" } });

  revalidatePath("/dashboard/ajustes");
}
