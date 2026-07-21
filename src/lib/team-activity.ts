import { prisma } from "@/lib/db";
import { getEffectiveStatus, type EffectiveStatus } from "@/lib/distribution";
import { startOfToday } from "@/lib/date-br";

export type AtividadeAtendente = {
  operatorId: string;
  name: string;
  status: EffectiveStatus;
  /** Primeira vez que ficou online hoje; null se não entrou hoje. */
  primeiroOnline: Date | null;
  recebidos: number;
  atendidos: number;
  /** Tempo online de hoje, em segundos. */
  tempoOnlineSeg: number;
};

/**
 * Atividade de hoje de todos os atendentes ativos, num lugar só: quando entrou,
 * status agora, quantos leads recebeu, quantos atendeu e quanto tempo ficou
 * online. Consolida o que antes estava espalhado entre o dashboard e a equipe.
 *
 * Tudo do dia (00h de Brasília em diante). Uma consulta por métrica, agregada
 * em memória — evita N+1 mesmo com a equipe inteira.
 */
export async function getAtividadeHoje(): Promise<AtividadeAtendente[]> {
  const inicio = startOfToday();
  const agora = new Date();

  const [operadores, recebidosGrp, atendidosGrp, sessoes] = await Promise.all([
    prisma.user.findMany({
      where: { role: "OPERATOR", approvalStatus: "APPROVED", active: true },
      select: { id: true, name: true, status: true, lastActivityAt: true, idleTimeoutMinutes: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["assignedOperatorId"],
      where: { assignedAt: { gte: inicio }, assignedOperatorId: { not: null } },
      _count: { _all: true },
    }),
    prisma.leadEvent.groupBy({
      by: ["operatorId"],
      where: { action: "ATTENDED", createdAt: { gte: inicio } },
      _count: { _all: true },
    }),
    // Sessões que tocam hoje: fecharam hoje ou seguem abertas.
    prisma.onlineSession.findMany({
      where: { OR: [{ endedAt: { gte: inicio } }, { endedAt: null }] },
      select: { operatorId: true, startedAt: true, endedAt: true },
    }),
  ]);

  const recebidosMap = new Map(recebidosGrp.map((r) => [r.assignedOperatorId as string, r._count._all]));
  const atendidosMap = new Map(atendidosGrp.map((a) => [a.operatorId, a._count._all]));

  // Por atendente: soma o tempo de hoje e acha o primeiro instante online hoje.
  const tempoMap = new Map<string, number>();
  const primeiroMap = new Map<string, Date>();
  const ultimaAtividade = new Map(operadores.map((o) => [o.id, o.lastActivityAt]));

  for (const s of sessoes) {
    const ini = s.startedAt > inicio ? s.startedAt : inicio;
    // Sessão aberta conta até a última atividade, não cegamente até agora — o
    // mesmo cuidado do card do atendente, pra não somar hora fantasma.
    const fim = s.endedAt ?? ultimaAtividade.get(s.operatorId) ?? agora;
    if (fim > ini) {
      tempoMap.set(s.operatorId, (tempoMap.get(s.operatorId) ?? 0) + (fim.getTime() - ini.getTime()) / 1000);
    }
    const anterior = primeiroMap.get(s.operatorId);
    if (!anterior || ini < anterior) primeiroMap.set(s.operatorId, ini);
  }

  return operadores.map((op) => ({
    operatorId: op.id,
    name: op.name,
    status: getEffectiveStatus(op),
    primeiroOnline: primeiroMap.get(op.id) ?? null,
    recebidos: recebidosMap.get(op.id) ?? 0,
    atendidos: atendidosMap.get(op.id) ?? 0,
    tempoOnlineSeg: Math.round(tempoMap.get(op.id) ?? 0),
  }));
}
