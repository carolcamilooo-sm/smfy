import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getEffectiveStatus, rescueWaitingLeads } from "@/lib/distribution";
import { abrirSessaoOnline, fecharSessaoOnline } from "@/lib/online-time";

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

  if (before.status === "ONLINE") {
    if (wasIdle) {
      // Voltou de ocioso: fecha a sessão que ficou aberta (o intervalo ocioso
      // não conta como online) e abre uma nova a partir de agora.
      await fecharSessaoOnline(session.user.id);
      await abrirSessaoOnline(session.user.id);
      await rescueWaitingLeads();
    } else {
      // Ativo e online: garante que há uma sessão aberta — cobre quem já estava
      // online de antes da sessão passar a ser registrada.
      await abrirSessaoOnline(session.user.id);
    }
  }

  return NextResponse.json({ ok: true });
}
