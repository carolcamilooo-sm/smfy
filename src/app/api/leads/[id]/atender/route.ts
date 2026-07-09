import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notifyAdmin, EVENTS } from "@/lib/realtime";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.assignedOperatorId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [updated] = await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: { serviceStatus: "ATTENDED", attendedAt: new Date() },
    }),
    prisma.leadEvent.create({
      data: { leadId: id, operatorId: session.user.id, action: "ATTENDED" },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  await notifyAdmin(EVENTS.leadAttended, {
    ...updated,
    value: updated.value ? Number(updated.value) : null,
  });

  return NextResponse.json({ ok: true });
}
