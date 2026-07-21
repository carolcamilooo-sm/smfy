import { prisma } from "@/lib/db";
import { startOfDayString, endOfDayString, brDateString } from "@/lib/date-br";

/** Um período contínuo online dentro do dia consultado. */
export type SessionSpan = {
  inicio: Date;
  fim: Date;
  /** Ainda aberta agora (só possível quando o dia consultado é hoje). */
  aberta: boolean;
  duracaoSeg: number;
};

export type LeadRecebido = {
  id: string;
  assignedAt: Date;
  customerName: string;
  product: string | null;
  paymentStatus: string;
  atendido: boolean;
  attendedAt: Date | null;
};

export type RelatorioAtendente = {
  operatorId: string;
  name: string;
  dia: string; // YYYY-MM-DD (Brasília)
  ehHoje: boolean;
  sessoes: SessionSpan[];
  /** Primeira vez que ficou online no dia; null se não entrou. */
  primeiroOnline: Date | null;
  tempoOnlineSeg: number;
  recebidos: number;
  atendidos: number;
  leads: LeadRecebido[];
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Normaliza o parâmetro de dia: aceita só YYYY-MM-DD, senão cai pra hoje. */
export function diaValido(dia: string | undefined): string {
  return dia && YMD.test(dia) ? dia : brDateString(new Date());
}

/**
 * Relatório de um atendente num dia: quando ficou online (cada janela),
 * quanto tempo somou, e todos os leads que recebeu com hora e desfecho.
 *
 * É a prova que o admin manda quando o atendente diz que "não recebeu lead":
 * ou aparecem os leads com horário, ou aparece que ele não ficou online.
 *
 * Tudo recortado ao dia em Brasília. A sessão que atravessa a meia-noite só
 * conta a fatia dentro do dia. Uma sessão ainda aberta conta até a última
 * atividade conhecida — nunca cegamente até agora —, o mesmo cuidado do card
 * do atendente pra não inventar hora de madrugada.
 */
export async function getRelatorioAtendente(
  operatorId: string,
  dia: string
): Promise<RelatorioAtendente | null> {
  const inicio = startOfDayString(dia);
  const fim = endOfDayString(dia);
  const ehHoje = dia === brDateString(new Date());

  const user = await prisma.user.findFirst({
    where: { id: operatorId, role: "OPERATOR" },
    select: { id: true, name: true, lastActivityAt: true },
  });
  if (!user) return null;

  const [sessoesRaw, leadsRaw] = await Promise.all([
    prisma.onlineSession.findMany({
      // Sessões que tocam o dia: começaram até o fim do dia e terminaram depois
      // do início (ou seguem abertas).
      where: {
        operatorId,
        startedAt: { lte: fim },
        OR: [{ endedAt: { gte: inicio } }, { endedAt: null }],
      },
      orderBy: { startedAt: "asc" },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.lead.findMany({
      where: { assignedOperatorId: operatorId, assignedAt: { gte: inicio, lte: fim } },
      orderBy: { assignedAt: "asc" },
      select: {
        id: true,
        assignedAt: true,
        customerName: true,
        product: true,
        paymentStatus: true,
        serviceStatus: true,
        attendedAt: true,
      },
    }),
  ]);

  const sessoes: SessionSpan[] = [];
  let primeiroOnline: Date | null = null;
  let tempoOnlineSeg = 0;

  for (const s of sessoesRaw) {
    const ini = s.startedAt > inicio ? s.startedAt : inicio;
    // Fim recortado ao dia. Sessão aberta: até a última atividade (protege de
    // hora fantasma), mas nunca além do fim do dia consultado.
    const fimBruto = s.endedAt ?? user.lastActivityAt;
    const fimClip = fimBruto > fim ? fim : fimBruto;
    if (fimClip <= ini) continue;

    const aberta = s.endedAt === null && ehHoje;
    const duracaoSeg = Math.round((fimClip.getTime() - ini.getTime()) / 1000);
    sessoes.push({ inicio: ini, fim: fimClip, aberta, duracaoSeg });
    tempoOnlineSeg += duracaoSeg;
    if (!primeiroOnline || ini < primeiroOnline) primeiroOnline = ini;
  }

  const leads: LeadRecebido[] = leadsRaw.map((l) => ({
    id: l.id,
    assignedAt: l.assignedAt as Date,
    customerName: l.customerName,
    product: l.product,
    paymentStatus: l.paymentStatus,
    atendido: l.serviceStatus === "ATTENDED",
    attendedAt: l.attendedAt,
  }));

  return {
    operatorId: user.id,
    name: user.name,
    dia,
    ehHoje,
    sessoes,
    primeiroOnline,
    tempoOnlineSeg,
    recebidos: leads.length,
    atendidos: leads.filter((l) => l.atendido).length,
    leads,
  };
}
