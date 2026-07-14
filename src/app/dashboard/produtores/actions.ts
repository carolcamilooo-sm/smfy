"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";

function generateToken() {
  return randomBytes(16).toString("hex");
}

export async function createProducer(formData: FormData) {
  await requireDashboardAccess();

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

export async function updateProducer(formData: FormData) {
  await requireDashboardAccess();

  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome do produtor.");

  await prisma.producer.update({ where: { id }, data: { name } });
  revalidatePath("/dashboard/produtores");
}

export async function addProduct(formData: FormData) {
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId"));
  const name = String(formData.get("name") ?? "").trim();
  const sigla = String(formData.get("sigla") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  if (!name) throw new Error("Informe o nome do produto.");

  await prisma.product.create({
    data: { producerId, name, sigla: sigla || null, codigo: codigo || null },
  });
  revalidatePath("/dashboard/produtores");
}

export async function updateProduct(formData: FormData) {
  await requireDashboardAccess();

  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Informe o nome do produto.");

  await prisma.product.update({ where: { id }, data: { name } });
  revalidatePath("/dashboard/produtores");
}

export async function removeProduct(formData: FormData) {
  await requireDashboardAccess();
  const id = String(formData.get("id"));
  await prisma.product.delete({ where: { id } });
  revalidatePath("/dashboard/produtores");
}

export async function toggleProductActive(formData: FormData) {
  await requireDashboardAccess();
  const id = String(formData.get("id"));
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });
  await prisma.product.update({ where: { id }, data: { active: !product.active } });
  revalidatePath("/dashboard/produtores");
}

/** Per-operator gate for a product: which categories (aprovados/pendentes) they're allowed to receive. */
export async function updateProductAccess(formData: FormData) {
  await requireDashboardAccess();

  const productId = String(formData.get("productId"));
  const operatorId = String(formData.get("operatorId"));
  const allowApproved = formData.get("allowApproved") === "on";
  const allowPending = formData.get("allowPending") === "on";

  if (!allowApproved && !allowPending) {
    await prisma.productAccess.deleteMany({ where: { productId, operatorId } });
  } else {
    await prisma.productAccess.upsert({
      where: { productId_operatorId: { productId, operatorId } },
      update: { allowApproved, allowPending },
      create: { productId, operatorId, allowApproved, allowPending },
    });
  }
  revalidatePath("/dashboard/produtores");
}

export async function regenerateToken(formData: FormData) {
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId"));
  await prisma.producer.update({
    where: { id: producerId },
    data: { webhookToken: generateToken() },
  });
  revalidatePath("/dashboard/produtores");
}

const SECRET_FIELDS = [
  "smpayWebhookSecret",
  "kiwifyWebhookSecret",
  "perfectpayToken",
  "paytIntegrationKey",
] as const;
type SecretField = (typeof SECRET_FIELDS)[number];

export async function updateGatewaySecret(formData: FormData) {
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId"));
  const field = String(formData.get("field"));
  if (!SECRET_FIELDS.includes(field as SecretField)) {
    throw new Error("campo de secret inválido");
  }
  const secret = String(formData.get("secret") ?? "").trim();

  await prisma.producer.update({
    where: { id: producerId },
    data: { [field as SecretField]: secret || null },
  });
  revalidatePath("/dashboard/produtores");
}

const GATEWAY_KEYS = ["kiwify", "perfectpay", "disrupty", "smpay", "payt"] as const;

/**
 * Just remembers which webhook tab the admin last looked at for this
 * producer, so it opens on the right one next visit — not user-facing data,
 * so no revalidatePath (would refetch the whole page on every tab click).
 */
export async function setLastWebhookGateway(formData: FormData) {
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId"));
  const gateway = String(formData.get("gateway"));
  if (!GATEWAY_KEYS.includes(gateway as (typeof GATEWAY_KEYS)[number])) return;

  await prisma.producer.update({
    where: { id: producerId },
    data: { lastWebhookGateway: gateway },
  });
}

/**
 * Producers with lead history can't be hard-deleted (leads reference them
 * for reporting), so they're archived instead: hidden from the active list
 * and their webhook stops creating new leads, but past leads stay intact.
 * Only producers with zero leads are actually erased.
 */
export async function removeProducer(formData: FormData) {
  await requireDashboardAccess();

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
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId"));
  await prisma.producer.update({ where: { id: producerId }, data: { active: true } });
  revalidatePath("/dashboard/produtores");
}
