"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity-log";
import { assignLead } from "@/lib/distribution";

function parseIds(formData: FormData, field: string): string[] {
  return String(formData.get(field) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Reenvia leads selecionados no histórico de volta pra fila dos atendentes
 * (remarketing), marcando cada um pra aparecer "REMARKETING" no lugar da hora
 * de chegada na fila do operador.
 *
 * Dois modos, decididos por `operatorIds`:
 * - vazio: automático — cada lead passa pelo motor normal (respeita quem está
 *   online e a trava de acesso do produtor);
 * - com atendentes: manual — os leads são divididos entre os escolhidos
 *   (rodízio simples), direto, sem passar pela trava. É uma escolha explícita
 *   do admin, então mandamos pra quem ele marcou mesmo que offline.
 *
 * A tela seleciona no máximo uma página (20) por vez; o teto de 200 é só uma
 * trava de sanidade pra isto nunca virar uma redistribuição em massa acidental.
 */
export async function redistribuirRemarketing(formData: FormData) {
  await requireDashboardAccess();

  const ids = parseIds(formData, "ids").slice(0, 200);
  if (ids.length === 0) return;

  const leads = await prisma.lead.findMany({ where: { id: { in: ids } } });

  const escolhidos = parseIds(formData, "operatorIds");
  if (escolhidos.length > 0) {
    // Valida e preserva a ordem em que foram marcados.
    const reais = await prisma.user.findMany({
      where: { id: { in: escolhidos }, role: "OPERATOR" },
      select: { id: true },
    });
    const validos = new Set(reais.map((r) => r.id));
    const alvo = escolhidos.filter((id) => validos.has(id));
    if (alvo.length === 0) return;

    const agora = new Date();
    for (let i = 0; i < leads.length; i++) {
      const operatorId = alvo[i % alvo.length];
      await prisma.$transaction([
        prisma.lead.update({
          where: { id: leads[i].id },
          data: { assignedOperatorId: operatorId, serviceStatus: "ASSIGNED", assignedAt: agora, remarketing: true },
        }),
        prisma.leadEvent.create({
          data: { leadId: leads[i].id, operatorId, action: "ASSIGNED" },
        }),
      ]);
    }
  } else {
    // Automático: motor (online + trava de acesso). assignLead não mexe no
    // campo remarketing, então marca todos de uma vez depois.
    for (const lead of leads) {
      await assignLead(lead);
    }
    await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { remarketing: true } });
  }

  await logActivity(
    "remarketing",
    `Redistribuiu ${leads.length} lead(s) como remarketing${
      escolhidos.length > 0 ? " (para atendentes escolhidos)" : " (automático)"
    }`
  );
  revalidatePath("/dashboard/historico");
}
