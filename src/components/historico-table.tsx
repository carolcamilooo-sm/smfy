"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brDateParts, brHour, brMinute } from "@/lib/date-br";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Data e hora sempre em Brasília, e não no relógio de quem abre a tela: o
 * servidor roda em UTC, então sem fixar o fuso a mesma linha mostraria horas
 * diferentes dependendo de onde a página foi montada. São os mesmos ajudantes
 * que o export em CSV usa, pra tela e planilha nunca discordarem.
 */
function formatDate(date: Date | string) {
  const { year, month, day } = brDateParts(new Date(date));
  return `${String(day).padStart(2, "0")} ${MONTHS[month]} ${year}`;
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  return `${String(brHour(d)).padStart(2, "0")}:${String(brMinute(d)).padStart(2, "0")}`;
}

function saleStatusBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Aprovado</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  if (status === "DECLINED") return <Badge tone="red">Recusado</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

function serviceStatusBadge(status: string) {
  if (status === "ATTENDED") return <Badge tone="green">✓ Atendido</Badge>;
  if (status === "ASSIGNED") return <Badge tone="blue">⏳ Em andamento</Badge>;
  return <Badge tone="red">✗ Não atendido</Badge>;
}

type Lead = {
  id: string;
  customerName: string;
  product: string | null;
  producer: { name: string } | null;
  paymentStatus: string;
  serviceStatus: string;
  assignedOperator: { name: string } | null;
  createdAt: Date | string;
};

type OperadorAlvo = { id: string; name: string; online: boolean };

export function HistoricoTable({
  leads,
  operadores,
  redistribuir,
}: {
  leads: Lead[];
  operadores: OperadorAlvo[];
  redistribuir: (formData: FormData) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [alvos, setAlvos] = useState<Set<string>>(new Set());

  function toggleAlvo(id: string) {
    setAlvos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="space-y-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-primary">
              <span className="font-mono font-semibold">{selected.size}</span> selecionado(s)
            </span>
            <a
              href={`/api/leads/export?ids=${Array.from(selected).join(",")}`}
              className="ml-auto"
            >
              <Button type="button" variant="secondary">
                Baixar selecionados
              </Button>
            </a>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelected(new Set());
                setAlvos(new Set());
              }}
            >
              Limpar seleção
            </Button>
          </div>

          {/* Escolha de quem recebe o remarketing. Nenhum marcado = automático
              (motor: online + trava de acesso). Um marcado = tudo pra ele.
              Vários = distribui entre eles. */}
          <div>
            <p className="mb-1.5 text-xs text-secondary">
              Redistribuir como <span className="font-semibold text-accent">remarketing</span> para:{" "}
              {alvos.size === 0
                ? "automático (online + regras)"
                : alvos.size === 1
                  ? "o atendente marcado"
                  : `${alvos.size} atendentes (dividido entre eles)`}
            </p>
            <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {operadores.map((op) => {
                const on = alvos.has(op.id);
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => toggleAlvo(op.id)}
                    className={
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                      (on
                        ? "border-accent bg-accent text-app"
                        : "border-border bg-surface text-secondary hover:text-primary")
                    }
                  >
                    <span
                      className={
                        "h-1.5 w-1.5 rounded-full " +
                        (op.online ? "bg-success" : "bg-muted")
                      }
                    />
                    {op.name}
                  </button>
                );
              })}
            </div>
          </div>

          <form
            action={redistribuir}
            onSubmit={(e) => {
              const alvoTxt =
                alvos.size === 0
                  ? "automaticamente (online + trava de acesso)"
                  : alvos.size === 1
                    ? "para o atendente escolhido"
                    : `divididos entre os ${alvos.size} atendentes escolhidos`;
              if (
                !confirm(
                  `Redistribuir ${selected.size} lead(s) como remarketing, ${alvoTxt}? Eles voltam pra fila e aparecem marcados como REMARKETING no lugar da hora de chegada.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="ids" value={Array.from(selected).join(",")} />
            <input type="hidden" name="operatorIds" value={Array.from(alvos).join(",")} />
            <Button type="submit">
              {alvos.size === 0
                ? "Redistribuir (automático)"
                : `Redistribuir para ${alvos.size} atendente${alvos.size > 1 ? "s" : ""}`}
            </Button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-app text-xs text-secondary">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Selecionar todos"
                  className="h-4 w-4"
                />
              </th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Status da venda</th>
              <th className="px-4 py-3">Atendente</th>
              <th className="px-4 py-3">Atendimento</th>
              <th className="px-4 py-3" title="Quando o lead entrou no SMFY, pelo webhook do gateway">
                Chegou em
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    aria-label={`Selecionar ${lead.customerName}`}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-4 py-3 text-primary">{lead.customerName}</td>
                <td className="px-4 py-3 text-accent">
                  {lead.product ? `${lead.product} — ${lead.producer?.name ?? "-"}` : lead.producer?.name ?? "-"}
                </td>
                <td className="px-4 py-3">{saleStatusBadge(lead.paymentStatus)}</td>
                <td className="px-4 py-3 text-secondary">{lead.assignedOperator?.name ?? "-"}</td>
                <td className="px-4 py-3">{serviceStatusBadge(lead.serviceStatus)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-secondary">
                  {formatDate(lead.createdAt)}{" "}
                  <span className="text-primary">{formatTime(lead.createdAt)}</span>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-secondary">
                  Nenhum lead encontrado para esse filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
