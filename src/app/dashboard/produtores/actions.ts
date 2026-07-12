"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("unauthorized");
  }
}

function generateToken() {
  return randomBytes(16).toString("hex");
}

export async function createProducer(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const productName = String(formData.get("productName") ?? "").trim();
  if (!name) throw new Error("Informe o nome do produtor.");

  await prisma.producer.create({
    data: {
      name,
      webhookToken: generateToken(),
      products: productName ? { create: [{ name: productName }] } : undefined,
    },
  });

  revalidatePath("/dashboard/produtores");
}

export async function addProduct(formData: FormData) {
  await requireAdmin();

  const producerId = String(formData.get("producerId"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome do produto.");

  await prisma.product.create({ data: { producerId, name } });
  revalidatePath("/dashboard/produtores");
}

export async function removeProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.product.delete({ where: { id } });
  revalidatePath("/dashboard/produtores");
}

export async function regenerateToken(formData: FormData) {
  await requireAdmin();

  const producerId = String(formData.get("producerId"));
  await prisma.producer.update({
    where: { id: producerId },
    data: { webhookToken: generateToken() },
  });
  revalidatePath("/dashboard/produtores");
}

export async function updateSmpaySecret(formData: FormData) {
  await requireAdmin();

  const producerId = String(formData.get("producerId"));
  const secret = String(formData.get("smpayWebhookSecret") ?? "").trim();
  await prisma.producer.update({
    where: { id: producerId },
    data: { smpayWebhookSecret: secret || null },
  });
  revalidatePath("/dashboard/produtores");
}

/**
 * Producers with lead history can't be hard-deleted (leads reference them
 * for reporting), so they're archived instead: hidden from the active list
 * and their webhook stops creating new leads, but past leads stay intact.
 * Only producers with zero leads are actually erased.
 */
export async function removeProducer(formData: FormData) {
  await requireAdmin();

  const producerId = String(formData.get("producerId"));
  const leadCount = await prisma.lead.count({ where: { producerId } });

  if (leadCount === 0) {
    await prisma.producer.delete({ where: { id: producerId } });
  } else {
    await prisma.producer.update({ where: { id: producerId }, data: { active: false } });
  }

  revalidatePath("/dashboard/produtores");
}

export async function reactivateProducer(formData: FormData) {
  await requireAdmin();

  const producerId = String(formData.get("producerId"));
  await prisma.producer.update({ where: { id: producerId }, data: { active: true } });
  revalidatePath("/dashboard/produtores");
}
