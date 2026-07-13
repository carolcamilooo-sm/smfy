import Link from "next/link";
import { auth } from "@/auth";
import { getOperatorHistory } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReatenderButton } from "./reatender-button";
import { BR_TIMEZONE } from "@/lib/date-br";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "today", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "month", label: "Este mês" },
];

function paymentTypeBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Pago</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  if (status === "DECLINED") return <Badge tone="red">Recusado</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

function formatResponse(seconds: number | null) {
  if (seconds == null) return "-";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min ${String(seconds % 60).padStart(2, "0")}s`;
}

export default async function HistoricoAtendentePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; period?: string }>;
}) {
  const session = await auth();
  const { q, period } = await searchParams;

  const [{ range, leads }, fallbackTemplate] = await Promise.all([
    getOperatorHistory(session!.user.id, { period, q }),
    prisma.messageTemplate.findFirst({
      where: { active: true, operatorId: session!.user.id },
      orderBy: { title: "asc" },
      select: { content: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Histórico</h1>
        <p className="text-sm text-secondary">Leads que você já atendeu.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <form method="get" className="flex-1">
          <input type="hidden" name="period" value={period ?? "today"} />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome ou produto"
            className="max-w-xs"
          />
        </form>
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`?period=${p.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={
              range.period === p.key
                ? "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-app"
                : "rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-secondary"
            }
          >
            {p.label}
          </Link>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className="pb-2.5">Cliente</th>
                <th className="pb-2.5">Produto</th>
                <th className="pb-2.5">Pagamento</th>
                <th className="pb-2.5">Tempo resp.</th>
                <th className="pb-2.5">Data</th>
                <th className="pb-2.5">Atendido em</th>
                <th className="pb-2.5">Mensagem usada</th>
                <th className="pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-2 font-semibold text-primary">{lead.customerName}</td>
                  <td className="py-3 pr-2 text-accent">
                    {lead.product
                      ? `${lead.product} — ${lead.producer?.name ?? "-"}`
                      : lead.producer?.name ?? "-"}
                  </td>
                  <td className="py-3 pr-2">{paymentTypeBadge(lead.paymentStatus)}</td>
                  <td className="py-3 pr-2 font-mono text-xs text-secondary">
                    {formatResponse(lead.responseSeconds)}
                  </td>
                  <td className="py-3 pr-2 font-mono text-xs text-secondary">
                    {lead.attendedAt
                      ? new Date(lead.attendedAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          timeZone: BR_TIMEZONE,
                        })
                      : "-"}
                  </td>
                  <td className="py-3 pr-2 font-mono text-xs text-secondary">
                    {lead.attendedAt
                      ? new Date(lead.attendedAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: BR_TIMEZONE,
                        })
                      : "-"}
                  </td>
                  <td className="py-3 pr-2 text-secondary">{lead.usedTemplate?.title ?? "-"}</td>
                  <td className="py-3">
                    <ReatenderButton
                      phone={lead.phone}
                      customerName={lead.customerName}
                      product={lead.product}
                      templateContent={lead.usedTemplate?.content ?? fallbackTemplate?.content ?? null}
                    />
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-secondary">
                    Nenhum lead atendido nesse período.
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
