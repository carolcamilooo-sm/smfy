"use client";

import { useEffect, useState } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import {
  MultiSelectFilter,
  decodeSelection,
  encodeSelection,
  effectiveSelection,
  matchesSelection,
} from "@/components/multi-select-filter";
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

const PAYMENT_OPTIONS = [
  { value: "APPROVED", label: "Pago" },
  { value: "PENDING", label: "Pendente" },
  { value: "DECLINED", label: "Recusado" },
  { value: "OTHER", label: "Outro" },
];

type QueueLead = {
  id: string;
  customerName: string;
  phone: string;
  product: string | null;
  producerId: string | null;
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
  producerId: string | null;
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
  // Filtros persistidos por operador: o atendente reencontra a fila do jeito
  // que deixou, sem reconfigurar a cada visita. A chave leva o operatorId pra
  // não misturar preferências num aparelho compartilhado.
  const ns = `smfy:queue-filters:${operatorId}`;
  const [producerFilter, setProducerFilter] = usePersistedState(`${ns}:producer`, "all");
  const [paymentFilter, setPaymentFilter] = usePersistedState(`${ns}:payment`, "all");
  const [productFilter, setProductFilter] = usePersistedState(`${ns}:product`, "all");
  const [periodFilter, setPeriodFilter] = usePersistedState(`${ns}:period`, "today");
  const [sortOrder, setSortOrder] = usePersistedState(`${ns}:sort`, "oldest");

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

  // Produtor/produto são opções dinâmicas: o que foi salvo e não está mais na
  // fila é descartado, e se não sobrar nada volta a mostrar tudo em vez de
  // prender o atendente numa lista vazia. A preferência não é apagada — quando
  // aquele produtor voltar a mandar lead, o filtro volta a valer.
  const producerEff = effectiveSelection(decodeSelection(producerFilter), producers);
  const productEff = effectiveSelection(decodeSelection(productFilter), products);
  const paymentEff = decodeSelection(paymentFilter);

  const filteredQueue = initialQueue
    .filter((lead) => matchesSelection(producerEff, lead.producer?.name ?? "Sem produtor"))
    .filter((lead) => matchesSelection(paymentEff, lead.paymentStatus))
    .filter((lead) => matchesSelection(productEff, lead.product ?? "Sem produto"))
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

  // Só as mensagens daquele produto, mais as que valem pra todos. É o que
  // impede mandar a copy de um produto no lead de outro.
  function templatesDoLead(lead: QueueLead) {
    return templates.filter(
      (t) => t.producerId === null || t.producerId === lead.producerId
    );
  }

  async function handleAtender(lead: QueueLead) {
    const doLead = templatesDoLead(lead);
    const templateId = selectedTemplate[lead.id] ?? doLead[0]?.id;
    const template = doLead.find((t) => t.id === templateId);
    if (!template) {
      alert("Cadastre uma mensagem para este produto em Meus produtos antes de atender.");
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
    const templateId = selectedTemplate[lead.id] ?? templatesDoLead(lead)[0]?.id;

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
  /**
   * O mesmo link que o botão Atender abriria, com a mensagem escolhida já
   * dentro. Recalculado a cada render, então acompanha a troca de mensagem no
   * seletor. Sem mensagem cadastrada, vai só o número — o WhatsApp abre igual,
   * em branco.
   */
  function linkWhatsApp(lead: QueueLead) {
    const doLead = templatesDoLead(lead);
    const template = doLead.find(
      (t) => t.id === (selectedTemplate[lead.id] ?? doLead[0]?.id)
    );
    const message = template
      ? fillTemplate(template.content, { nome: lead.customerName, produto: lead.product })
      : "";
    return buildWhatsAppUrl(lead.phone, message);
  }

  async function handleCopyLink(lead: QueueLead) {
    const doLead = templatesDoLead(lead);
    const templateId = selectedTemplate[lead.id] ?? doLead[0]?.id;
    const ok = confirm(
      `Link de ${lead.customerName} copiado, já com a mensagem. Marcar como atendido? Ele sai da sua fila.`
    );
    if (!ok) return;

    setPending(lead.id);
    try {
      await fetch(`/api/leads/${lead.id}/atender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Manda o templateId pra ficar registrado qual mensagem foi usada,
        // igual acontece quando ele clica em Atender.
        body: JSON.stringify({ templateId }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

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
        <div data-card-header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-title">Fila de atendimento</h2>
          {initialQueue.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <MultiSelectFilter
                label="Produtor"
                totalCount={initialQueue.length}
                selection={producerEff}
                onChange={(next) => setProducerFilter(encodeSelection(next))}
                options={producers.map((name) => ({
                  value: name,
                  label: name,
                  count: initialQueue.filter(
                    (l) => (l.producer?.name ?? "Sem produtor") === name
                  ).length,
                }))}
              />
              <MultiSelectFilter
                label="Pagamento"
                totalCount={initialQueue.length}
                selection={paymentEff}
                onChange={(next) => setPaymentFilter(encodeSelection(next))}
                options={PAYMENT_OPTIONS.map(({ value, label }) => ({
                  value,
                  label,
                  count: initialQueue.filter((l) => l.paymentStatus === value).length,
                }))}
              />
              <MultiSelectFilter
                label="Produto"
                totalCount={initialQueue.length}
                selection={productEff}
                onChange={(next) => setProductFilter(encodeSelection(next))}
                options={products.map((name) => ({
                  value: name,
                  label: name,
                  count: initialQueue.filter((l) => (l.product ?? "Sem produto") === name).length,
                }))}
              />
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
                  onChange={(e) => setSortOrder(e.target.value)}
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
                  value={selectedTemplate[lead.id] ?? templatesDoLead(lead)[0]?.id ?? ""}
                  onChange={(e) =>
                    setSelectedTemplate((prev) => ({ ...prev, [lead.id]: e.target.value }))
                  }
                >
                  {templatesDoLead(lead).length === 0 && (
                    <option value="">Nenhuma mensagem para este produto</option>
                  )}
                  {templatesDoLead(lead).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleAtender(lead)}
                    disabled={pending === lead.id || templatesDoLead(lead).length === 0}
                    className="flex-1"
                  >
                    Atender
                  </Button>
                  <CopyButton
                    value={lead.phone}
                    title="Copiar número do lead"
                    onCopied={() => handleCopyAtender(lead)}
                  />
                  <CopyButton
                    value={linkWhatsApp(lead)}
                    label="Copiar link"
                    copiedLabel="Link copiado"
                    title="Copia o link do WhatsApp já com a mensagem escolhida"
                    onCopied={() => handleCopyLink(lead)}
                  />
                  {hasAttendWebhook && (
                    // Mesma variante do "Atender": as duas são a ação principal
                    // do lead, só mudam o caminho (WhatsApp ou extensão).
                    <Button
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
                        value={selectedTemplate[lead.id] ?? templatesDoLead(lead)[0]?.id ?? ""}
                        onChange={(e) =>
                          setSelectedTemplate((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                      >
                        {templatesDoLead(lead).length === 0 && (
                          <option value="">Nenhuma mensagem para este produto</option>
                        )}
                        {templatesDoLead(lead).map((t) => (
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
                          disabled={pending === lead.id || templatesDoLead(lead).length === 0}
                        >
                          Atender
                        </Button>
                        {hasAttendWebhook && (
                          // Mesma variante do "Atender": as duas são a ação
                          // principal, só muda o caminho (WhatsApp ou extensão).
                          <Button
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
                        <CopyButton
                          value={linkWhatsApp(lead)}
                          label="Copiar link"
                          copiedLabel="Link copiado"
                          title="Copia o link do WhatsApp já com a mensagem escolhida"
                          onCopied={() => handleCopyLink(lead)}
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
