"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";
import { isGatewayKey, GATEWAY_DB_VALUE } from "@/lib/gateways";

function novoToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Cria (ou recria) o webhook de vendas da empresa pra um gateway. Recriar troca
 * o token, então a URL antiga para de funcionar na hora — é assim que se corta
 * o acesso de quem não deveria mais ter a URL.
 */
export async function gerarWebhookVendas(formData: FormData) {
  await requireDashboardAccess();

  const gateway = String(formData.get("gateway") ?? "");
  if (!isGatewayKey(gateway)) throw new Error("Gateway desconhecido.");

  const dbGateway = GATEWAY_DB_VALUE[gateway];
  await prisma.companySalesWebhook.upsert({
    where: { gateway: dbGateway },
    update: { token: novoToken(), active: true },
    create: { gateway: dbGateway, token: novoToken(), active: true },
  });

  revalidatePath("/dashboard/integracoes");
}

export async function salvarSegredoVendas(formData: FormData) {
  await requireDashboardAccess();

  const gateway = String(formData.get("gateway") ?? "");
  if (!isGatewayKey(gateway)) throw new Error("Gateway desconhecido.");

  const secret = String(formData.get("secret") ?? "").trim();
  await prisma.companySalesWebhook.update({
    where: { gateway: GATEWAY_DB_VALUE[gateway] },
    // Vazio vira null: sem segredo, o webhook aceita sem conferir assinatura.
    data: { secret: secret || null },
  });

  revalidatePath("/dashboard/integracoes");
}

export async function removerWebhookVendas(formData: FormData) {
  await requireDashboardAccess();

  const gateway = String(formData.get("gateway") ?? "");
  if (!isGatewayKey(gateway)) throw new Error("Gateway desconhecido.");

  await prisma.companySalesWebhook.deleteMany({
    where: { gateway: GATEWAY_DB_VALUE[gateway] },
  });

  revalidatePath("/dashboard/integracoes");
}
