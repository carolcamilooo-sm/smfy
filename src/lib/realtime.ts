import Pusher from "pusher";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const CHANNELS = {
  admin: "private-admin-dashboard",
  operator: (id: string) => `private-operator-${id}`,
};

export const EVENTS = {
  leadNew: "lead:new",
  leadAssigned: "lead:assigned",
  leadAttended: "lead:attended",
  operatorStatusChanged: "operator:status-changed",
};

// Realtime push is a UX enhancement layered on top of the database as the
// source of truth — a Pusher outage or missing credentials should never fail
// the webhook/API request that triggered the notification.

export async function notifyAdmin(event: string, data: unknown) {
  try {
    await pusherServer.trigger(CHANNELS.admin, event, data);
  } catch (err) {
    console.error("[realtime] failed to notify admin channel", err);
  }
}

export async function notifyOperator(
  operatorId: string,
  event: string,
  data: unknown
) {
  try {
    await pusherServer.trigger(CHANNELS.operator(operatorId), event, data);
  } catch (err) {
    console.error("[realtime] failed to notify operator channel", err);
  }
}
