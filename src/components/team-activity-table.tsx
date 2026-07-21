import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatarTempoOnline } from "@/lib/online-time";
import { BR_TIMEZONE } from "@/lib/date-br";
import type { AtividadeAtendente } from "@/lib/team-activity";

function statusBadge(status: string) {
  if (status === "ONLINE") return <Badge tone="green">Online</Badge>;
  if (status === "IDLE") return <Badge tone="yellow">Ocioso</Badge>;
  return <Badge tone="gray">Offline</Badge>;
}

function horaBR(d: Date) {
  return new Date(d).toLocaleTimeString("pt-BR", {
    timeZone: BR_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Atividade de hoje da equipe, num só lugar. Ordenada por não-atendidos (quem
 * está mais acumulando aparece no topo), pra o gargalo saltar aos olhos.
 */
export function TeamActivityTable({ atividade }: { atividade: AtividadeAtendente[] }) {
  const ordenada = [...atividade].sort((a, b) => {
    const naoA = a.recebidos - a.atendidos;
    const naoB = b.recebidos - b.atendidos;
    return naoB - naoA;
  });

  const totRecebidos = atividade.reduce((s, a) => s + a.recebidos, 0);
  const totAtendidos = atividade.reduce((s, a) => s + a.atendidos, 0);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-title">Atividade de hoje</h2>
        <span className="text-xs text-secondary">
          equipe: <span className="font-mono text-primary">{totRecebidos}</span> recebidos ·{" "}
          <span className="font-mono text-primary">{totAtendidos}</span> atendidos
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="px-4 py-2.5 font-medium">Atendente</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium" title="Primeira vez que ficou online hoje">
                Entrou às
              </th>
              <th className="px-4 py-2.5 font-medium">Tempo online</th>
              <th className="px-4 py-2.5 text-right font-medium">Recebidos</th>
              <th className="px-4 py-2.5 text-right font-medium">Atendidos</th>
              <th className="px-4 py-2.5 text-right font-medium" title="Recebidos que ele ainda não atendeu hoje">
                Na fila
              </th>
            </tr>
          </thead>
          <tbody>
            {ordenada.map((a) => {
              const naFila = a.recebidos - a.atendidos;
              return (
                <tr key={a.operatorId} className="border-b border-border last:border-0 hover:bg-app">
                  <td className="px-4 py-2.5 font-medium text-primary">{a.name}</td>
                  <td className="px-4 py-2.5">{statusBadge(a.status)}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-secondary">
                    {a.primeiroOnline ? horaBR(a.primeiroOnline) : "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-secondary">
                    {a.tempoOnlineSeg > 0 ? formatarTempoOnline(a.tempoOnlineSeg) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-secondary">{a.recebidos}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-primary">{a.atendidos}</td>
                  <td
                    className={
                      "px-4 py-2.5 text-right font-mono font-semibold " +
                      (naFila > 30 ? "text-danger" : naFila > 0 ? "text-warning" : "text-muted")
                    }
                  >
                    {naFila}
                  </td>
                </tr>
              );
            })}
            {ordenada.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-secondary">
                  Nenhum atendente ativo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted">
        Tudo de hoje, desde 00h. &quot;Entrou às&quot; é a primeira vez online no dia; começou
        a ser medido quando o registro de tempo online foi ligado.
      </p>
    </Card>
  );
}
