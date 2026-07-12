import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GATEWAY_ADAPTERS, GATEWAY_DB_VALUE, isGatewayKey } from "@/lib/gateways";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Personal sales webhook: each operator points their own gateway account
 * here to feed the sales-count ranking. Independent from the Lead
 * distribution pipeline — only approved (converted) sales are counted, and
 * there's no signature check (token-only), since this only affects a
 * gamification number, not lead routing.
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
  const operator = await prisma.user.findUnique({ where: { salesWebhookToken: token } });
  if (!operator) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const adapter = GATEWAY_ADAPTERS[gateway];

  let normalized;
  try {
    normalized = adapter.parseWebhook(rawBody, request.headers);
  } catch (err) {
    console.error(`[webhook:operator-sales:${gateway}] failed to parse payload`, err);
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (!normalized || normalized.paymentStatus !== "APPROVED") {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  let rawPayload: Prisma.InputJsonValue;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    rawPayload = { raw: rawBody };
  }

  const sale = await prisma.operatorSale.upsert({
    where: {
      operatorId_gateway_externalId: {
        operatorId: operator.id,
        gateway: GATEWAY_DB_VALUE[gateway],
        externalId: normalized.externalId,
      },
    },
    update: {
      customerName: normalized.customerName,
      value: normalized.value,
      rawPayload,
    },
    create: {
      operatorId: operator.id,
      gateway: GATEWAY_DB_VALUE[gateway],
      externalId: normalized.externalId,
      customerName: normalized.customerName,
      value: normalized.value,
      rawPayload,
    },
  });

  return NextResponse.json({ ok: true, saleId: sale.id });
}
