import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GATEWAY_ADAPTERS, GATEWAY_DB_VALUE, isGatewayKey } from "@/lib/gateways";
import { matchSaleToLead } from "@/lib/sale-matching";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Webhook de vendas da empresa: um endereço só, para o gateway da operação.
 *
 * Diferente do webhook pessoal — onde o token já diz de quem é a venda — aqui
 * o dono é descoberto casando o comprador com um lead já distribuído. Assim o
 * ranking se alimenta sozinho, sem depender de cada atendente configurar o
 * seu, e sem dar margem pra alguém inflar o próprio número.
 *
 * Venda que não casa com lead nenhum (compra orgânica, por exemplo) não vira
 * registro: ela não é de ninguém, e inventar um dono seria pior que ignorar.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gateway: string }> }
) {
  const { gateway } = await context.params;

  if (!isGatewayKey(gateway)) {
    return NextResponse.json({ error: "unknown gateway" }, { status: 404 });
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const config = await prisma.companySalesWebhook.findFirst({
    where: { token, gateway: GATEWAY_DB_VALUE[gateway], active: true },
  });
  if (!config) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const adapter = GATEWAY_ADAPTERS[gateway];

  // Assinatura confere o corpo inteiro: sem isso, quem descobrisse a URL
  // poderia inventar vendas e mexer no ranking.
  if (config.secret && adapter.verifySignature) {
    const ok = adapter.verifySignature(
      rawBody,
      request.headers,
      request.nextUrl,
      config.secret
    );
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let normalized;
  try {
    normalized = adapter.parseWebhook(rawBody, request.headers);
  } catch (err) {
    console.error(`[webhook:company-sales:${gateway}] falha ao ler payload`, err);
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Só venda paga entra no ranking. Pendente e recusada não são venda; e
  // reembolso/chargeback chegam como OTHER e também não contam.
  if (!normalized || normalized.paymentStatus !== "APPROVED") {
    return NextResponse.json({ ignored: true, reason: "não é venda aprovada" }, { status: 200 });
  }

  const match = await matchSaleToLead({
    document: normalized.document,
    phone: normalized.phone,
    email: normalized.email,
  });

  if (!match) {
    return NextResponse.json(
      { ignored: true, reason: "comprador não bate com nenhum lead atendido" },
      { status: 200 }
    );
  }

  let rawPayload: Prisma.InputJsonValue;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    rawPayload = { raw: rawBody };
  }

  // A chave única (atendente, gateway, transação) torna isto idempotente: o
  // gateway pode reenviar o mesmo evento à vontade que a venda não duplica.
  const sale = await prisma.operatorSale.upsert({
    where: {
      operatorId_gateway_externalId: {
        operatorId: match.operatorId,
        gateway: GATEWAY_DB_VALUE[gateway],
        externalId: normalized.externalId,
      },
    },
    update: {
      paymentStatus: "APPROVED",
      value: normalized.value,
      customerName: normalized.customerName,
      leadId: match.leadId,
      rawPayload,
    },
    create: {
      operatorId: match.operatorId,
      gateway: GATEWAY_DB_VALUE[gateway],
      externalId: normalized.externalId,
      customerName: normalized.customerName,
      value: normalized.value,
      paymentStatus: "APPROVED",
      leadId: match.leadId,
      rawPayload,
    },
  });

  return NextResponse.json({
    ok: true,
    saleId: sale.id,
    operatorId: match.operatorId,
    leadId: match.leadId,
  });
}
