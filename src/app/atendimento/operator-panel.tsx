"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fillTemplate } from "@/lib/template";
import { buildWhatsAppUrl } from "@/lib/phone";
import { getPusherClient } from "@/lib/pusher-client";
import { CHANNELS, EVENTS } from "@/lib/realtime";

type QueueLead = {
  id: string;
  customerName: string;
  phone: string;
  product: string | null;
  value: number | null;
  gateway: string;
  paymentStatus: string;
};

type Template = {
  id: string;
  title: string;
  content: string;
};

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

export function OperatorPanel({
  operatorId,
  initialStatus,
  initialQueue,
  templates,
  attendedToday,
}: {
  operatorId: string;
  initialStatus: "ONLINE" | "OFFLINE";
  initialQueue: QueueLead[];
  templates: Template[];
  attendedToday: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>(
    {}
  );
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "ONLINE") return;
    const id = setInterval(() => {
      fetch("/api/operators/heartbeat", { method: "POST" }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const pusher = getPusherClient();
    const channel = CHANNELS.operator(operatorId);
    const sub = pusher.subscribe(channel);
    const handler = () => router.refresh();
    sub.bind(EVENTS.leadAssigned, handler);
    return () => {
      sub.unbind(EVENTS.leadAssigned, handler);
      pusher.unsubscribe(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId]);

  async function toggleStatus() {
    const next = status === "ONLINE" ? "OFFLINE" : "ONLINE";
    setStatus(next);
    await fetch("/api/operators/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }

  async function handleAtender(lead: QueueLead) {
    const templateId = selectedTemplate[lead.id] ?? templates[0]?.id;
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      alert("Cadastre uma mensagem em Configurações antes de atender.");
      return;
    }

    const message = fillTemplate(template.content, {
      nome: lead.customerName,
      produto: lead.product,
    });
    const url = buildWhatsAppUrl(lead.phone, message);

    window.open(url, "_blank", "noopener,noreferrer");

    setPending(lead.id);
    try {
      await fetch(`/api/leads/${lead.id}/atender`, { method: "POST" });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-400">Seu status</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium">
            {status === "ONLINE" ? (
              <Badge tone="green">Online</Badge>
            ) : (
              <Badge tone="gray">Offline</Badge>
            )}
            <span className="text-neutral-500">
              · {attendedToday} atendidos hoje
            </span>
          </p>
        </div>
        <Button
          variant={status === "ONLINE" ? "danger" : "primary"}
          onClick={toggleStatus}
        >
          {status === "ONLINE" ? "Ficar offline" : "Ficar online"}
        </Button>
      </Card>

      {status === "OFFLINE" && (
        <p className="text-sm text-neutral-500">
          Você está offline e não vai receber novos leads. Fique online para
          começar a atender.
        </p>
      )}

      <div className="space-y-4">
        {initialQueue.map((lead) => (
          <Card key={lead.id} className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{lead.customerName}</p>
                <p className="text-xs text-neutral-400">{lead.phone}</p>
              </div>
              <Badge tone={lead.paymentStatus === "APPROVED" ? "green" : "yellow"}>
                {lead.paymentStatus === "APPROVED" ? "Aprovado" : "Pendente"}
              </Badge>
            </div>
            <div className="text-xs text-neutral-400">
              {lead.product ?? "Produto não informado"}
              {lead.value != null && (
                <span>
                  {" "}
                  ·{" "}
                  {lead.value.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              )}
              {" · "}
              {lead.gateway}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                value={selectedTemplate[lead.id] ?? templates[0]?.id ?? ""}
                onChange={(e) =>
                  setSelectedTemplate((prev) => ({
                    ...prev,
                    [lead.id]: e.target.value,
                  }))
                }
              >
                {templates.length === 0 && (
                  <option value="">Nenhuma mensagem cadastrada</option>
                )}
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => handleAtender(lead)}
                disabled={pending === lead.id || templates.length === 0}
              >
                Atender no WhatsApp
              </Button>
            </div>
          </Card>
        ))}

        {initialQueue.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nenhum lead na sua fila no momento.
          </p>
        )}
      </div>
    </div>
  );
}
