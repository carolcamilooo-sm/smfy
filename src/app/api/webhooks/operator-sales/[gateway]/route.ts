import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GATEWAY_ADAPTERS, GATEWAY_DB_VALUE, isGatewayKey } from "@/lib/gateways";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Personal sales webhook: each operator points their own gateway account
 * here to feed the sales-count ranking. Independent from the Lead
 * distribution pipeline — there's no signature check (token-only), since
 * this only affects a gamification number, not lead routing.
 *
 * Approved, pending and declined sales are all persisted (with their
 * status), so nothing is silently dropped — a pending sale later flips to
 * APPROVED/DECLINED via the same upsert when the gateway sends the
 * follow-up event. Only unparseable/irrelevant events (refunds,
 * chargebacks, unrelated webhook types) are ignored outright.
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

  const TRACKED_STATUSES = ["APPROVED", "PENDING", "DECLINED"];
  if (!normalized || !TRACKED_STATUSES.includes(normalized.paymentStatus)) {
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
      paymentStatus: normalized.paymentStatus,
      rawPayload,
    },
    create: {
      operatorId: operator.id,
      gateway: GATEWAY_DB_VALUE[gateway],
      externalId: normalized.externalId,
      customerName: normalized.customerName,
      value: normalized.value,
      paymentStatus: normalized.paymentStatus,
      rawPayload,
    },
  });

  return NextResponse.json({ ok: true, saleId: sale.id });
}
