import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GATEWAY_ADAPTERS, GATEWAY_DB_VALUE, isGatewayKey } from "@/lib/gateways";
import { assignLead } from "@/lib/distribution";
import { notifyAdmin, notifyOperator, EVENTS } from "@/lib/realtime";
import { normalizePhone } from "@/lib/phone";
import type { Lead } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

function serializeLead(lead: Lead) {
  return {
    ...lead,
    value: lead.value ? Number(lead.value) : null,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gateway: string }> }
) {
  const { gateway } = await context.params;

  if (!isGatewayKey(gateway)) {
    return NextResponse.json({ error: "unknown gateway" }, { status: 404 });
  }

  const expectedToken = process.env.WEBHOOK_TOKEN;
  const token = request.nextUrl.searchParams.get("token");
  if (expectedToken && token !== expectedToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  const adapter = GATEWAY_ADAPTERS[gateway];

  if (adapter.verifySignature) {
    const valid = adapter.verifySignature(rawBody, request.headers, request.nextUrl);
    if (!valid) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let normalized;
  try {
    normalized = adapter.parseWebhook(rawBody, request.headers);
  } catch (err) {
    console.error(`[webhook:${gateway}] failed to parse payload`, err);
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (!normalized) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const dbGateway = GATEWAY_DB_VALUE[gateway];
  const phone = normalizePhone(normalized.phone);

  const existing = await prisma.lead.findUnique({
    where: {
      gateway_externalId: { gateway: dbGateway, externalId: normalized.externalId },
    },
  });

  let rawPayload: Prisma.InputJsonValue;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    rawPayload = { raw: rawBody };
  }

  if (existing) {
    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        customerName: normalized.customerName,
        phone,
        email: normalized.email,
        product: normalized.product,
        value: normalized.value,
        paymentStatus: normalized.paymentStatus,
        rawPayload,
      },
    });
    await notifyAdmin(EVENTS.leadNew, serializeLead(updated));
    return NextResponse.json({ ok: true, leadId: updated.id });
  }

  const lead = await prisma.lead.create({
    data: {
      gateway: dbGateway,
      externalId: normalized.externalId,
      customerName: normalized.customerName,
      phone,
      email: normalized.email,
      product: normalized.product,
      value: normalized.value,
      paymentStatus: normalized.paymentStatus,
      rawPayload,
    },
  });

  await notifyAdmin(EVENTS.leadNew, serializeLead(lead));

  const assigned = await assignLead(lead);
  await notifyAdmin(EVENTS.leadAssigned, serializeLead(assigned));
  if (assigned.assignedOperatorId) {
    await notifyOperator(assigned.assignedOperatorId, EVENTS.leadAssigned, serializeLead(assigned));
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}
