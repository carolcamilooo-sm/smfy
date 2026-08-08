"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity-log";

/**
 * Ajusta o tempo de ociosidade de um atendente (minutos até ficar ocioso e
 * offline). Limitado a uma faixa sensata: menos de 2 min derrubaria a pessoa a
 * cada pausa curta; mais de 120 min faria alguém que largou a tela seguir
 * recebendo lead por horas.
 */
export async function updateIdleTimeout(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  const minutos = Math.min(120, Math.max(2, Math.round(Number(formData.get("idleTimeoutMinutes")) || 10)));

  const u = await prisma.user.update({
    where: { id: operatorId, role: "OPERATOR" },
    data: { idleTimeoutMinutes: minutos },
  });

  await logActivity("operator.idle", `Ajustou a ociosidade de ${u.name} para ${minutos}min`);
  revalidatePath("/dashboard/operadores");
}

export async function approveOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));

  const u = await prisma.user.update({
    where: { id: operatorId, role: "OPERATOR" },
    data: { approvalStatus: "APPROVED" },
  });

  // Já entra na distribuição: a fatia é automática, não tem % pra preencher.
  await prisma.distributionRule.upsert({
    where: { operatorId },
    update: {},
    create: { operatorId, active: true },
  });

  await logActivity("operator.approve", `Aprovou o atendente ${u.name}`);
  revalidatePath("/dashboard/operadores");
}

export async function rejectOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));

  const u = await prisma.user.update({
    where: { id: operatorId, role: "OPERATOR" },
    data: { approvalStatus: "REJECTED" },
  });

  await logActivity("operator.reject", `Recusou o atendente ${u.name}`);
  revalidatePath("/dashboard/operadores");
}

/**
 * Operators with lead history can't be hard-deleted (leads and lead events
 * reference them for reporting), so they're deactivated instead: hidden
 * from the active roster and blocked from logging in, but past leads stay
 * intact. Only operators with zero history are actually erased.
 */
export async function removeOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  const alvo = await prisma.user.findUnique({ where: { id: operatorId }, select: { name: true } });
  const [assignedLeadCount, leadEventCount] = await Promise.all([
    prisma.lead.count({ where: { assignedOperatorId: operatorId } }),
    prisma.leadEvent.count({ where: { operatorId } }),
  ]);

  let acao: string;
  if (assignedLeadCount === 0 && leadEventCount === 0) {
    await prisma.user.delete({ where: { id: operatorId, role: "OPERATOR" } });
    acao = "Removeu";
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: operatorId, role: "OPERATOR" }, data: { active: false } }),
      prisma.distributionRule.updateMany({ where: { operatorId }, data: { active: false } }),
    ]);
    acao = "Desativou";
  }

  await logActivity("operator.remove", `${acao} o atendente ${alvo?.name ?? "removido"}`);
  revalidatePath("/dashboard/operadores");
}

export async function reactivateOperator(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  const u = await prisma.user.update({ where: { id: operatorId, role: "OPERATOR" }, data: { active: true } });

  await logActivity("operator.reactivate", `Reativou o atendente ${u.name}`);
  revalidatePath("/dashboard/operadores");
}

function clampPercent(value: FormDataEntryValue | null) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

/**
 * A conta individual não tem mais % própria: ela só liga ou desliga da
 * distribuição, e a fatia sai automática (ver splitShares). Por isso aqui só
 * mexemos em `active` — os pesos antigos ficam no banco, intocados.
 */
export async function updateDistribution(formData: FormData) {
  await requireDashboardAccess();

  const operatorId = String(formData.get("operatorId"));
  const active = formData.get("active") === "on";
  const userActive = formData.get("userActive") === "on";
  const priority = formData.get("priority") === "on";
  // Teto de pagos na fila: vazio/0 = sem teto (null). Positivo = mantém esse
  // tanto de pago na fila do atendente.
  const maxPaidRaw = String(formData.get("maxPaidQueue") ?? "").trim();
  const maxPaidNum = Math.floor(Number(maxPaidRaw));
  const maxPaidQueue =
    maxPaidRaw !== "" && Number.isFinite(maxPaidNum) && maxPaidNum > 0 ? maxPaidNum : null;

  const [, u] = await prisma.$transaction([
    prisma.distributionRule.upsert({
      where: { operatorId },
      update: { active },
      create: { operatorId, active },
    }),
    prisma.user.update({
      where: { id: operatorId, role: "OPERATOR" },
      data: { active: userActive, priority, maxPaidQueue },
    }),
  ]);

  await logActivity(
    "operator.distribution",
    `Alterou a distribuição de ${u.name} (distribuição: ${active ? "on" : "off"}, ativo: ${
      userActive ? "sim" : "não"
    }, prioridade: ${priority ? "sim" : "não"}, máx. pagos: ${maxPaidQueue ?? "—"})`
  );
  revalidatePath("/dashboard/operadores");
}

export async function createGroup(formData: FormData) {
  await requireDashboardAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await prisma.attendanceGroup.create({ data: { name } });
  await logActivity("group.create", `Criou o grupo "${name}"`);
  revalidatePath("/dashboard/operadores");
}

export async function updateGroup(formData: FormData) {
  await requireDashboardAccess();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  // Contas marcadas neste grupo. Como uma pessoa pode estar em vários grupos ao
  // mesmo tempo (um por demanda, por exemplo), aqui a gente só define quem está
  // NESTE grupo — a participação dela nos outros não é tocada. `set` faz as
  // duas coisas de uma vez: entra quem foi marcado, sai quem foi desmarcado.
  const memberIds = formData.getAll("member").map(String);

  const g = await prisma.attendanceGroup.update({
    where: { id },
    data: {
      name,
      weightApproved: clampPercent(formData.get("weightApproved")),
      // O grupo só privilegia venda aprovada. Zerados, pendente e recusado
      // caem no rodízio normal pros membros — que é o que a tela promete.
      weightPending: 0,
      weightDeclined: 0,
      active: formData.get("active") === "on",
      members: { set: memberIds.map((memberId) => ({ id: memberId })) },
    },
  });
  await logActivity(
    "group.update",
    `Editou o grupo "${g.name}" (aprovados: ${g.weightApproved}%, membros: ${memberIds.length})`
  );
  revalidatePath("/dashboard/operadores");
}

export async function removeGroup(formData: FormData) {
  await requireDashboardAccess();
  const id = String(formData.get("id"));
  const g = await prisma.attendanceGroup.findUnique({ where: { id }, select: { name: true } });
  // A tabela de ligação some junto (ON DELETE CASCADE), então as contas apenas
  // deixam de participar deste grupo — os outros grupos delas continuam.
  await prisma.attendanceGroup.delete({ where: { id } });
  await logActivity("group.remove", `Removeu o grupo "${g?.name ?? "removido"}"`);
  revalidatePath("/dashboard/operadores");
}
