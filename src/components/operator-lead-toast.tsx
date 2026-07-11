"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { CHANNELS, EVENTS } from "@/lib/realtime";
import { playBeep } from "@/lib/beep";

type LeadEventPayload = {
  id: string;
  customerName: string;
};

const AUTO_DISMISS_MS = 6000;

export function OperatorLeadToast({
  operatorId,
  notifySound,
}: {
  operatorId: string;
  notifySound: boolean;
}) {
  const [toast, setToast] = useState<LeadEventPayload | null>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = CHANNELS.operator(operatorId);
    const sub = pusher.subscribe(channel);

    const handler = (data: LeadEventPayload) => {
      setToast(data);
      if (notifySound) playBeep();
    };
    sub.bind(EVENTS.leadAssigned, handler);

    return () => {
      sub.unbind(EVENTS.leadAssigned, handler);
      pusher.unsubscribe(channel);
    };
  }, [operatorId, notifySound]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex items-start gap-3 rounded-xl border border-accent/40 bg-surface px-4 py-3 shadow-lg">
      <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
      <div>
        <p className="text-sm font-semibold text-primary">
          Novo lead atribuído a você
        </p>
        <p className="text-xs text-secondary">{toast.customerName} · via WhatsApp · agora</p>
      </div>
    </div>
  );
}
