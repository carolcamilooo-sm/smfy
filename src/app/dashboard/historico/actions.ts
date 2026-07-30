"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";
import { assignLead } from "@/lib/distribution";

/**
 * Reenvia leads selecionados no histórico de volta pra fila dos atendentes
 * (remarketing). Cada lead é redistribuído pelo motor normal — respeita quem
 * está online e a trava de acesso do produtor — e marcado como remarketing,
 * pra na fila do operador aparecer "REMARKETING" no lugar da hora de chegada.
 *
 * A tela seleciona no máximo uma página (20) por vez; o teto de 200 é só uma
 * trava de sanidade pra isto nunca virar uma redistribuição em massa acidental.
 */
export async function redistribuirRemarketing(formData: FormData) {
  await requireDashboardAccess();

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
  if (ids.length === 0) return;

  const leads = await prisma.lead.findMany({ where: { id: { in: ids } } });
  for (const lead of leads) {
    await assignLead(lead);
  }
  // assignLead não mexe nesse campo; marca todos de uma vez.
  await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { remarketing: true } });

  revalidatePath("/dashboard/historico");
}
