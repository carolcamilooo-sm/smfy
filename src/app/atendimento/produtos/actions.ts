"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireOperator() {
  const session = await auth();
  if (!session) throw new Error("unauthorized");
  return session.user.id;
}

/**
 * Só deixa gravar mensagem em produtor que o atendente realmente atende — ou
 * sem produtor nenhum, que é a mensagem geral. Sem isso, um id vindo do
 * formulário poderia apontar pra qualquer produtor.
 */
async function assertProdutorLiberado(operatorId: string, producerId: string | null) {
  if (!producerId) return;
  const liberado = await prisma.productAccess.findFirst({
    where: {
      operatorId,
      product: { producerId },
      OR: [{ allowApproved: true }, { allowPending: true }],
    },
    select: { productId: true },
  });
  if (!liberado) throw new Error("Você não atende esse produto.");
}

function lerProducerId(formData: FormData): string | null {
  const raw = String(formData.get("producerId") ?? "").trim();
  return raw === "" || raw === "geral" ? null : raw;
}

export async function createTemplate(formData: FormData) {
  const operatorId = await requireOperator();

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) throw new Error("Preencha título e mensagem.");

  const producerId = lerProducerId(formData);
  await assertProdutorLiberado(operatorId, producerId);

  await prisma.messageTemplate.create({ data: { title, content, operatorId, producerId } });
  revalidatePath("/atendimento/produtos");
  revalidatePath("/atendimento");
}

export async function updateTemplate(formData: FormData) {
  const operatorId = await requireOperator();

  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const active = formData.get("active") === "on";

  // updateMany com operatorId no where: garante que ninguém edite a mensagem
  // de outro atendente passando um id qualquer.
  await prisma.messageTemplate.updateMany({
    where: { id, operatorId },
    data: { title, content, active },
  });
  revalidatePath("/atendimento/produtos");
  revalidatePath("/atendimento");
}

export async function deleteTemplate(formData: FormData) {
  const operatorId = await requireOperator();
  const id = String(formData.get("id"));
  await prisma.messageTemplate.deleteMany({ where: { id, operatorId } });
  revalidatePath("/atendimento/produtos");
  revalidatePath("/atendimento");
}
