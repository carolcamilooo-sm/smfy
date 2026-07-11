"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function registerOperator(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    throw new Error("Preencha nome, e-mail e uma senha com 6+ caracteres.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(
      "Já existe uma solicitação com este e-mail. Fale com o administrador."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "OPERATOR",
      approvalStatus: "PENDING",
    },
  });
}
