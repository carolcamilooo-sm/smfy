import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { markLeadAttended } from "@/lib/attend";
import { fillTemplate } from "@/lib/template";

const HOOK_TIMEOUT_MS = 10_000;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const templateId = typeof body.templateId === "string" ? body.templateId : undefined;

  const [lead, operator] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: { producer: { select: { name: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
  ]);

  if (!lead || lead.assignedOperatorId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!operator.attendWebhookUrl) {
    return NextResponse.json(
      { error: "Configure a URL da sua extensão em Ajustes antes de atender por hook." },
      { status: 400 }
    );
  }

  let message: string | null = null;
  if (templateId) {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, operatorId: session.user.id },
    });
    if (template) {
      message = fillTemplate(template.content, {
        nome: lead.customerName,
        produto: lead.product,
      });
    }
  }

  // lead.phone já é gravado normalizado (55 + DDD + número) na entrada do webhook.
  const payload = {
    leadId: lead.id,
    name: lead.customerName,
    phone: lead.phone,
    email: lead.email,
    product: lead.product,
    producer: lead.producer?.name ?? null,
    value: lead.value ? Number(lead.value) : null,
    paymentStatus: lead.paymentStatus,
    message,
  };

  // O lead só é marcado como atendido se a extensão confirmar: se ela estiver
  // fora do ar, o lead continua na fila em vez de sumir sem ninguém ter falado
  // com o cliente.
  try {
    const res = await fetch(operator.attendWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(HOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Sua extensão respondeu ${res.status}. O lead segue na fila.` },
        { status: 502 }
      );
    }
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? `Sua extensão não respondeu em ${HOOK_TIMEOUT_MS / 1000}s.`
        : "Não foi possível falar com sua extensão.";
    console.error(`[atender-hook] falha ao chamar webhook do operador ${session.user.id}`, err);
    return NextResponse.json({ error: `${reason} O lead segue na fila.` }, { status: 502 });
  }

  await markLeadAttended(id, session.user.id, templateId);

  return NextResponse.json({ ok: true });
}
