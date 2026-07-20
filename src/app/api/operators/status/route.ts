import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { rescueWaitingLeads } from "@/lib/distribution";
import { notifyAdmin, EVENTS } from "@/lib/realtime";
import { abrirSessaoOnline, fecharSessaoOnline } from "@/lib/online-time";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const status = body.status === "ONLINE" ? "ONLINE" : "OFFLINE";

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { status, lastActivityAt: new Date() },
  });

  await notifyAdmin(EVENTS.operatorStatusChanged, {
    id: user.id,
    status: user.status,
  });

  // Registra o tempo online: liga abre a sessão, desliga fecha.
  if (status === "ONLINE") {
    await abrirSessaoOnline(user.id);
    await rescueWaitingLeads();
  } else {
    await fecharSessaoOnline(user.id);
  }

  return NextResponse.json({ status: user.status });
}
