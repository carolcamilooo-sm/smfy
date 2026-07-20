import { prisma } from "@/lib/db";
import { startOfToday, brWeekday, brDateString, shiftDateString, startOfDayString } from "@/lib/date-br";

/**
 * Abre uma sessão online se não houver uma aberta. Idempotente de propósito: o
 * heartbeat chama isto o tempo todo, e a conta só deve ter UMA sessão aberta —
 * senão o tempo somaria duplicado.
 */
export async function abrirSessaoOnline(operatorId: string): Promise<void> {
  const aberta = await prisma.onlineSession.findFirst({
    where: { operatorId, endedAt: null },
    select: { id: true },
  });
  if (!aberta) {
    await prisma.onlineSession.create({ data: { operatorId } });
  }
}

/**
 * Fecha a sessão aberta, se houver. Chamado quando o atendente sai ou fica
 * ocioso. Fecha TODAS as abertas por segurança — no fluxo normal só existe uma,
 * mas fechar o excedente evita tempo fantasma se algo abriu duas.
 */
export async function fecharSessaoOnline(operatorId: string): Promise<void> {
  await prisma.onlineSession.updateMany({
    where: { operatorId, endedAt: null },
    data: { endedAt: new Date() },
  });
}

/** Início da semana (segunda) e do mês, em Brasília. */
function inicioSemana(): Date {
  const hoje = brDateString(new Date());
  const wd = brWeekday(new Date()); // 0=domingo
  const diffSegunda = wd === 0 ? 6 : wd - 1;
  return startOfDayString(shiftDateString(hoje, -diffSegunda));
}

function inicioMes(): Date {
  const hoje = brDateString(new Date());
  return startOfDayString(`${hoje.slice(0, 7)}-01`);
}

/**
 * Soma o tempo online em segundos desde `desde`.
 *
 * Conta só a parte da sessão que cai dentro da janela: uma sessão que começou
 * ontem e segue aberta hoje só conta, no "hoje", a partir da meia-noite.
 *
 * A sessão ainda aberta NÃO conta cegamente até agora — conta até a última
 * atividade conhecida (`ultimaAtividade`). Sem isso, quem fecha o navegador sem
 * clicar "sair" acumularia horas fantasma de madrugada, já que a sessão fica
 * aberta pra sempre. Estando de fato online, a última atividade é de segundos
 * atrás, então a perda é desprezível.
 */
function somarSessoes(
  sessoes: { startedAt: Date; endedAt: Date | null }[],
  desde: Date,
  ultimaAtividade: Date
): number {
  let total = 0;
  for (const s of sessoes) {
    const ini = s.startedAt > desde ? s.startedAt : desde;
    const fim = s.endedAt ?? ultimaAtividade;
    if (fim > ini) total += (fim.getTime() - ini.getTime()) / 1000;
  }
  return Math.round(total);
}

export type TempoOnline = { hoje: number; semana: number; mes: number };

/** Tempo online (segundos) de hoje, esta semana e este mês. */
export async function getTempoOnline(operatorId: string): Promise<TempoOnline> {
  const semana = inicioSemana();
  const mes = inicioMes();
  const hoje = startOfToday();
  // A janela mais ampla das três; busca uma vez e filtra em memória.
  const maisAntiga = mes < semana ? mes : semana;

  const [user, sessoes] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: operatorId }, select: { lastActivityAt: true } }),
    prisma.onlineSession.findMany({
      where: {
        operatorId,
        OR: [{ endedAt: { gte: maisAntiga } }, { endedAt: null }],
      },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  return {
    hoje: somarSessoes(sessoes, hoje, user.lastActivityAt),
    semana: somarSessoes(sessoes, semana, user.lastActivityAt),
    mes: somarSessoes(sessoes, mes, user.lastActivityAt),
  };
}

/** Segundos -> "2h 30min" / "45min" / "12min". */
export function formatarTempoOnline(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}
