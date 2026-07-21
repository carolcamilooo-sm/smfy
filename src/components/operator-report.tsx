import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BR_TIMEZONE } from "@/lib/date-br";
import { formatarTempoOnline } from "@/lib/online-time";
import type { RelatorioAtendente } from "@/lib/operator-report";

function hora(d: Date) {
  return new Date(d).toLocaleTimeString("pt-BR", {
    timeZone: BR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusPagamento(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Aprovado</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  if (status === "DECLINED") return <Badge tone="red">Recusado</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

function Tile({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold text-primary">{valor}</p>
      {sub && <p className="text-[11px] text-secondary">{sub}</p>}
    </div>
  );
}

/**
 * Relatório por atendente: uma aba por pessoa e, ao escolher uma, tudo do dia
 * dela — quando ficou online (cada janela), quanto somou, e cada lead recebido
 * com hora e desfecho. É o que o admin manda de prova quando alguém diz que
 * "não recebeu lead": ou os leads aparecem com horário, ou aparece que a pessoa
 * não ficou online.
 */
export function OperatorReport({
  operadores,
  selecionado,
  dia,
  hoje,
  relatorio,
  controls,
}: {
  operadores: { id: string; name: string }[];
  selecionado: string | null;
  dia: string;
  hoje: string;
  relatorio: RelatorioAtendente | null;
  /** Seletor de data (client). Passado de fora pra este ficar server. */
  controls: React.ReactNode;
}) {
  const naFila = relatorio ? relatorio.recebidos - relatorio.atendidos : 0;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-title">Relatório por atendente</h2>
        <p className="mt-0.5 text-xs text-secondary">
          Escolha um atendente e um dia: veja quando ficou online e cada lead que
          recebeu, com horário. Serve de prova de quem recebeu — ou de quem não
          ficou disponível.
        </p>
      </div>

      {/* Abas: uma por atendente. O dia atual é preservado ao trocar de aba. */}
      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
        {operadores.map((op) => {
          const ativo = op.id === selecionado;
          return (
            <Link
              key={op.id}
              href={`?atendente=${op.id}&dia=${dia}`}
              scroll={false}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                ativo
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border bg-surface text-secondary hover:text-primary"
              )}
            >
              {op.name}
            </Link>
          );
        })}
      </div>

      {!relatorio ? (
        <p className="px-4 py-8 text-center text-sm text-secondary">
          Selecione um atendente acima para ver o relatório.
        </p>
      ) : (
        <div className="space-y-5 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-primary">{relatorio.name}</p>
              <p className="text-xs text-secondary">
                {relatorio.ehHoje ? "Hoje" : "Relatório do dia"} ·{" "}
                {new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { timeZone: BR_TIMEZONE })}
              </p>
            </div>
            {controls}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile
              label="Entrou às"
              valor={relatorio.primeiroOnline ? hora(relatorio.primeiroOnline) : "—"}
              sub={relatorio.primeiroOnline ? "1ª vez online no dia" : "não ficou online"}
            />
            <Tile
              label="Tempo online"
              valor={
                relatorio.tempoOnlineSeg > 0
                  ? formatarTempoOnline(relatorio.tempoOnlineSeg)
                  : "—"
              }
              sub={`${relatorio.sessoes.length} ${relatorio.sessoes.length === 1 ? "período" : "períodos"}`}
            />
            <Tile label="Leads recebidos" valor={String(relatorio.recebidos)} />
            <Tile
              label="Atendidos"
              valor={String(relatorio.atendidos)}
              sub={naFila > 0 ? `${naFila} ainda na fila` : "nada na fila"}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Linha do tempo do status — a prova de presença/ausência. */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-secondary">
                Linha do tempo — status online
              </h3>
              {relatorio.sessoes.length === 0 ? (
                <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-xs text-danger">
                  Não registrou nenhum período online neste dia.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {relatorio.sessoes.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          s.aberta ? "animate-pulse bg-success" : "bg-muted"
                        )}
                      />
                      <span className="font-mono text-primary">
                        {hora(s.inicio)} → {s.aberta ? "agora" : hora(s.fim)}
                      </span>
                      <span className="ml-auto font-mono text-secondary">
                        {s.aberta && "online · "}
                        {formatarTempoOnline(s.duracaoSeg)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Leads recebidos no dia, com hora e desfecho. */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-secondary">
                Leads recebidos ({relatorio.recebidos})
              </h3>
              {relatorio.leads.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface px-3 py-2.5 text-xs text-muted">
                  Nenhum lead recebido neste dia.
                </p>
              ) : (
                <ol className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                  {relatorio.leads.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
                    >
                      <span className="font-mono text-secondary">{hora(l.assignedAt)}</span>
                      <span className="min-w-0 flex-1 truncate text-primary">
                        {l.customerName}
                        {l.product && <span className="text-muted"> · {l.product}</span>}
                      </span>
                      {statusPagamento(l.paymentStatus)}
                      {l.atendido ? (
                        <Badge tone="green">✓ atendido</Badge>
                      ) : (
                        <Badge tone="gray">na fila</Badge>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted">
            Tudo recortado ao dia (00h às 24h de Brasília). &quot;Tempo online&quot; soma os
            períodos em que o atendente esteve com o status ligado; um período ainda
            aberto conta até a última atividade dele. &quot;Leads recebidos&quot; são os que
            caíram pra ele neste dia — se a lista estiver cheia e ele disser que não
            recebeu, aqui está a hora de cada um.
          </p>
        </div>
      )}
    </Card>
  );
}
