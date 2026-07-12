"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireOperator() {
  const session = await auth();
  if (!session) throw new Error("unauthorized");
  return session.user.id;
}

export async function createTemplate(formData: FormData) {
  const operatorId = await requireOperator();

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) throw new Error("Preencha título e mensagem.");

  await prisma.messageTemplate.create({ data: { title, content, operatorId } });
  revalidatePath("/atendimento/mensagens");
}

export async function updateTemplate(formData: FormData) {
  const operatorId = await requireOperator();

  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const active = formData.get("active") === "on";

  await prisma.messageTemplate.updateMany({
    where: { id, operatorId },
    data: { title, content, active },
  });
  revalidatePath("/atendimento/mensagens");
}

export async function deleteTemplate(formData: FormData) {
  const operatorId = await requireOperator();
  const id = String(formData.get("id"));
  await prisma.messageTemplate.deleteMany({ where: { id, operatorId } });
  revalidatePath("/atendimento/mensagens");
}
