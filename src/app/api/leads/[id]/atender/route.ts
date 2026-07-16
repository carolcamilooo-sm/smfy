import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { markLeadAttended } from "@/lib/attend";

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

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.assignedOperatorId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await markLeadAttended(id, session.user.id, templateId);

  return NextResponse.json({ ok: true });
}
