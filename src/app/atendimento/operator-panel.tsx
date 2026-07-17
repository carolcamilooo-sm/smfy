"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { fillTemplate } from "@/lib/template";
import { buildWhatsAppUrl } from "@/lib/phone";
import { getPusherClient } from "@/lib/pusher-client";
import { CHANNELS, EVENTS } from "@/lib/realtime";
import { brDateString, shiftDateString, startOfDayString } from "@/lib/date-br";

type QueueLead = {
  id: string;
  customerName: string;
  phone: string;
  product: string | null;
  producer: { name: string } | null;
  value: number | null;
  gateway: string;
  paymentStatus: string;
  assignedAt: string | Date | null;
};

type Template = {
  id: string;
  title: string;
  content: string;
};

function paymentTypeBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Pago</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  if (status === "DECLINED") return <Badge tone="red">Recusado</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

function formatWait(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${String(s).padStart(2, "0")}s`;
}

export function OperatorPanel({
  operatorId,
  initialQueue,
  templates,
  attendedToday,
  receivedToday,
  hasAttendWebhook,
}: {
  operatorId: string;
  initialQueue: QueueLead[];
  templates: Template[];
  attendedToday: number;
  receivedToday: number;
  hasAttendWebhook: boolean;
}) {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [producerFilter, setProducerFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("today");
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");

  const producers = Array.from(
    new Set(initialQueue.map((lead) => lead.producer?.name ?? "Sem produtor"))
  ).sort((a, b) => a.localeCompare(b));

  const products = Array.from(
    new Set(initialQueue.map((lead) => lead.product ?? "Sem produto"))
  ).sort((a, b) => a.localeCompare(b));

  const todayStr = brDateString(new Date());
  const sevenDaysAgoStart = startOfDayString(shiftDateString(todayStr, -6));

  function withinPeriod(lead: QueueLead) {
    if (periodFilter === "all") return true;
    if (!lead.assignedAt) return true;
    const assignedAt = new Date(lead.assignedAt);
    if (periodFilter === "today") return brDateString(assignedAt) === todayStr;
    if (periodFilter === "7d") return assignedAt >= sevenDaysAgoStart;
    return true;
  }

  const filteredQueue = initialQueue
    .filter((lead) =>
      producerFilter === "all" ? true : (lead.producer?.name ?? "Sem produtor") === producerFilter
    )
    .filter((lead) => (paymentFilter === "all" ? true : lead.paymentStatus === paymentFilter))
    .filter((lead) => (productFilter === "all" ? true : (lead.product ?? "Sem produto") === productFilter))
    .filter(withinPeriod)
    .sort((a, b) => {
      const aTime = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
      const bTime = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;
      return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  async function handleAtender(lead: QueueLead) {
    const templateId = selectedTemplate[lead.id] ?? templates[0]?.id;
    const template = templates.find((t) => t.id === templateId);
    if (!template) {
      alert("Cadastre uma mensagem em Mensagens antes de atender.");
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
      await fetch(`/api/leads/${lead.id}/atender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  // A extensão é quem fala com o cliente aqui — o servidor só entrega o lead
  // pra ela. Se ela não confirmar, o lead continua na fila (o erro vem da API).
  async function handleAtenderHook(lead: QueueLead) {
    const templateId = selectedTemplate[lead.id] ?? templates[0]?.id;

    setPending(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}/atender-hook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Não foi possível atender por hook. O lead segue na fila.");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  // Copiar o número não marca nada sozinho: quem confirma é o atendente, senão
  // um clique sem querer tiraria o lead da fila.
  async function handleCopyAtender(lead: QueueLead) {
    const ok = confirm(
      `Número de ${lead.customerName} copiado. Marcar como atendido? Ele sai da sua fila.`
    );
    if (!ok) return;

    setPending(lead.id);
    try {
      await fetch(`/api/leads/${lead.id}/atender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Meus leads</h1>
        <p className="text-sm text-secondary">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-secondary">Recebidos hoje</p>
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">
            {receivedToday}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Atendidos hoje</p>
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">
            {attendedToday}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-secondary">Não atendidos</p>
          {/* A fila só traz lead ASSIGNED, então o total dela já é o que falta atender. */}
          <p className="mt-2.5 font-mono text-3xl font-semibold text-primary">
            {initialQueue.length}
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-title">Fila de atendimento</h2>
          {initialQueue.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="producer-filter" className="text-xs text-secondary">
                  Produtor
                </label>
                <select
                  id="producer-filter"
                  value={producerFilter}
                  onChange={(e) => setProducerFilter(e.target.value)}
                  className="rounded-md border border-border bg-app px-2.5 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                >
                  <option value="all">Todos ({initialQueue.length})</option>
                  {producers.map((name) => (
                    <option key={name} value={name}>
                      {name} ({initialQueue.filter((l) => (l.producer?.name ?? "Sem produtor") === name).length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="payment-filter" className="text-xs text-secondary">
                  Pagamento
                </label>
                <select
                  id="payment-filter"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="rounded-md border border-border bg-app px-2.5 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="APPROVED">
                    Pago ({initialQueue.filter((l) => l.paymentStatus === "APPROVED").length})
                  </option>
                  <option value="PENDING">
                    Pendente ({initialQueue.filter((l) => l.paymentStatus === "PENDING").length})
                  </option>
                  <option value="DECLINED">
                    Recusado ({initialQueue.filter((l) => l.paymentStatus === "DECLINED").length})
                  </option>
                  <option value="OTHER">
                    Outro ({initialQueue.filter((l) => l.paymentStatus === "OTHER").length})
                  </option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="product-filter" className="text-xs text-secondary">
                  Produto
                </label>
                <select
                  id="product-filter"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="rounded-md border border-border bg-app px-2.5 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                >
                  <option value="all">Todos ({initialQueue.length})</option>
                  {products.map((name) => (
                    <option key={name} value={name}>
                      {name} ({initialQueue.filter((l) => (l.product ?? "Sem produto") === name).length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="period-filter" className="text-xs text-secondary">
                  Período
                </label>
                <select
                  id="period-filter"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="rounded-md border border-border bg-app px-2.5 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                >
                  <option value="all">Todos</option>
                  <option value="today">Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-order" className="text-xs text-secondary">
                  Ordem
                </label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "oldest" | "newest")}
                  className="rounded-md border border-border bg-app px-2.5 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                >
                  <option value="oldest">Mais antigo primeiro</option>
                  <option value="newest">Mais recente primeiro</option>
                </select>
              </div>
            </div>
          )}
        </div>
        {/* No celular a tabela teria ~640px e só rolaria de lado; cada lead vira
            um card empilhado, com as mesmas ações. */}
        <div className="flex flex-col gap-3 md:hidden">
          {filteredQueue.map((lead) => {
            const assignedAtMs = lead.assignedAt ? new Date(lead.assignedAt).getTime() : now;
            const waitSeconds = Math.max(0, Math.floor((now - assignedAtMs) / 1000));
            return (
              <div key={lead.id} className="rounded-xl border border-border bg-app p-3.5">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="font-semibold text-primary">{lead.customerName}</p>
                  {paymentTypeBadge(lead.paymentStatus)}
                </div>
                <p className="mb-2 text-sm font-semibold text-accent">
                  {lead.product
                    ? `${lead.product} — ${lead.producer?.name ?? "-"}`
                    : lead.producer?.name ?? "-"}
                </p>
                <p className="mb-3 font-mono text-xs font-semibold text-warning">
                  esperando há {formatWait(waitSeconds)}
                </p>

                <select
                  className="mb-3 w-full rounded-md border border-border bg-surface px-2 py-2 text-xs text-primary focus:border-accent focus:outline-none"
                  value={selectedTemplate[lead.id] ?? templates[0]?.id ?? ""}
                  onChange={(e) =>
                    setSelectedTemplate((prev) => ({ ...prev, [lead.id]: e.target.value }))
                  }
                >
                  {templates.length === 0 && <option value="">Nenhuma mensagem</option>}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleAtender(lead)}
                    disabled={pending === lead.id || templates.length === 0}
                    className="flex-1"
                  >
                    Atender
                  </Button>
                  <CopyButton
                    value={lead.phone}
                    title="Copiar número do lead"
                    onCopied={() => handleCopyAtender(lead)}
                  />
                  {hasAttendWebhook && (
                    <Button
                      variant="secondary"
                      onClick={() => handleAtenderHook(lead)}
                      disabled={pending === lead.id}
                      className="w-full"
                    >
                      Atender por hook
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredQueue.length === 0 && (
            <p className="py-6 text-center text-secondary">
              {initialQueue.length === 0
                ? "Nenhum lead na sua fila no momento."
                : "Nenhum lead bate com esses filtros."}
            </p>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className="pb-2.5">Nome</th>
                <th className="pb-2.5">Produto</th>
                <th className="pb-2.5">Tipo</th>
                <th className="pb-2.5">Esperando há</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Mensagem</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((lead) => {
                const assignedAtMs = lead.assignedAt ? new Date(lead.assignedAt).getTime() : now;
                const waitSeconds = Math.max(0, Math.floor((now - assignedAtMs) / 1000));
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="py-3.5 pr-2 font-semibold text-primary">
                      {lead.customerName}
                    </td>
                    <td className="py-3.5 pr-2 font-semibold text-accent">
                      {lead.product ? `${lead.product} — ${lead.producer?.name ?? "-"}` : lead.producer?.name ?? "-"}
                    </td>
                    <td className="py-3.5 pr-2">{paymentTypeBadge(lead.paymentStatus)}</td>
                    <td className="py-3.5 pr-2 font-mono text-xs font-semibold text-warning">
                      {formatWait(waitSeconds)}
                    </td>
                    <td className="py-3.5 pr-2">
                      <Badge tone="red">Sem atendimento</Badge>
                    </td>
                    <td className="py-3.5 pr-2">
                      <select
                        className="w-full rounded-md border border-border bg-app px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                        value={selectedTemplate[lead.id] ?? templates[0]?.id ?? ""}
                        onChange={(e) =>
                          setSelectedTemplate((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                      >
                        {templates.length === 0 && <option value="">Nenhuma mensagem</option>}
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Button
                          onClick={() => handleAtender(lead)}
                          disabled={pending === lead.id || templates.length === 0}
                        >
                          Atender
                        </Button>
                        {hasAttendWebhook && (
                          <Button
                            variant="secondary"
                            onClick={() => handleAtenderHook(lead)}
                            disabled={pending === lead.id}
                            title="Enviar esse lead pra sua extensão"
                          >
                            Atender por hook
                          </Button>
                        )}
                        <CopyButton
                          value={lead.phone}
                          title="Copiar número do lead"
                          onCopied={() => handleCopyAtender(lead)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredQueue.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-secondary">
                    {initialQueue.length === 0
                      ? "Nenhum lead na sua fila no momento."
                      : "Nenhum lead bate com esses filtros."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
