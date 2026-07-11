"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import { CHANNELS, EVENTS } from "@/lib/realtime";

type LeadEventPayload = {
  id: string;
  customerName: string;
  assignedOperator?: { name: string } | null;
};

const AUTO_DISMISS_MS = 6000;

export function LeadToast() {
  const [toast, setToast] = useState<LeadEventPayload | null>(null);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = CHANNELS.admin;
    const sub = pusher.subscribe(channel);

    const handler = (data: LeadEventPayload) => setToast(data);
    sub.bind(EVENTS.leadNew, handler);
    sub.bind(EVENTS.leadAssigned, handler);

    return () => {
      sub.unbind(EVENTS.leadNew, handler);
      sub.unbind(EVENTS.leadAssigned, handler);
      pusher.unsubscribe(channel);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed right-6 top-6 z-50 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
      <span className="mt-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-success" />
      <div>
        <p className="text-sm font-medium text-primary">
          Novo lead recebido
        </p>
        <p className="text-xs text-secondary">
          {toast.assignedOperator
            ? `Atribuído a ${toast.assignedOperator.name} · agora`
            : `${toast.customerName} · agora`}
        </p>
      </div>
    </div>
  );
}
