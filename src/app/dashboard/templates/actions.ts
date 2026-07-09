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

export async function createTemplate(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) throw new Error("Preencha título e mensagem.");

  await prisma.messageTemplate.create({ data: { title, content } });
  revalidatePath("/dashboard/templates");
}

export async function updateTemplate(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const active = formData.get("active") === "on";

  await prisma.messageTemplate.update({
    where: { id },
    data: { title, content, active },
  });
  revalidatePath("/dashboard/templates");
}

export async function deleteTemplate(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.messageTemplate.delete({ where: { id } });
  revalidatePath("/dashboard/templates");
}
