"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher-client";

export function RealtimeRefresher({
  channel,
  events,
}: {
  channel: string;
  events: string[];
}) {
  const router = useRouter();

  useEffect(() => {
    const pusher = getPusherClient();
    const sub = pusher.subscribe(channel);

    const handler = () => router.refresh();
    events.forEach((event) => sub.bind(event, handler));

    return () => {
      events.forEach((event) => sub.unbind(event, handler));
      pusher.unsubscribe(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, events.join(",")]);

  return null;
}
