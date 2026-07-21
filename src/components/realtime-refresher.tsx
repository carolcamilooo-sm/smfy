"use client";

import { useEffect } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { useThrottledRefresh } from "@/lib/use-throttled-refresh";

export function RealtimeRefresher({
  channel,
  events,
}: {
  channel: string;
  events: string[];
}) {
  // Teto de frequência: em pico chegam vários eventos por segundo, e sem freio
  // cada um re-roda todas as queries da página e trava a tela.
  const refresh = useThrottledRefresh(8000);

  useEffect(() => {
    const pusher = getPusherClient();
    const sub = pusher.subscribe(channel);

    const handler = () => refresh();
    events.forEach((event) => sub.bind(event, handler));

    return () => {
      events.forEach((event) => sub.unbind(event, handler));
      pusher.unsubscribe(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, events.join(","), refresh]);

  return null;
}
