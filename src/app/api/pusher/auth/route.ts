import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessDashboard } from "@/lib/access";
import { pusherServer, CHANNELS } from "@/lib/realtime";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const socketId = formData.get("socket_id") as string;
  const channel = formData.get("channel_name") as string;

  if (channel === CHANNELS.admin && !canAccessDashboard(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (channel.startsWith("private-operator-")) {
    const operatorId = channel.replace("private-operator-", "");
    if (session.user.role !== "OPERATOR" || session.user.id !== operatorId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}
