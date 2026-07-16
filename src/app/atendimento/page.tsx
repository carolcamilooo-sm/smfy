import { auth } from "@/auth";
import { getOperatorData } from "@/lib/queries";
import { OperatorPanel } from "./operator-panel";

export default async function AtendimentoPage() {
  const session = await auth();
  const data = await getOperatorData(session!.user.id);

  return (
    <OperatorPanel
      operatorId={session!.user.id}
      initialQueue={data.queue}
      templates={data.templates}
      attendedToday={data.attendedToday}
      receivedToday={data.receivedToday}
      hasAttendWebhook={data.hasAttendWebhook}
    />
  );
}
