import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getEffectiveStatus, rescueWaitingLeads } from "@/lib/distribution";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const before = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  const wasIdle = getEffectiveStatus(before) !== "ONLINE";

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastActivityAt: new Date() },
  });

  // The operator just went from idle/offline back to active — hand them
  // any leads that were stuck waiting because no one was eligible.
  if (wasIdle && before.status === "ONLINE") {
    await rescueWaitingLeads();
  }

  return NextResponse.json({ ok: true });
}
