"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export type ActionState = { error?: string; success?: string };

function accountPath(role: string) {
  return role === "ADMIN" ? "/dashboard/ajustes" : "/atendimento/ajustes";
}

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Não autorizado." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!name || !email) return { error: "Preencha nome e e-mail." };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email },
    });
  } catch {
    return { error: "Não foi possível salvar. O e-mail já pode estar em uso." };
  }

  revalidatePath(accountPath(session.user.role));
  return { success: "Perfil atualizado." };
}

export async function changePassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Não autorizado." };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 6) {
    return { error: "A nova senha precisa ter pelo menos 6 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "A confirmação não bate com a nova senha." };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: "Senha atual incorreta." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  revalidatePath(accountPath(session.user.role));
  return { success: "Senha alterada com sucesso." };
}

export async function updateNotificationPreference(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("unauthorized");

  const field = formData.get("field");
  const value = formData.get("value") === "true";

  if (field !== "notifySound" && field !== "notifyIdleWarning") {
    throw new Error("invalid field");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { [field]: value },
  });

  revalidatePath(accountPath(session.user.role));
}
