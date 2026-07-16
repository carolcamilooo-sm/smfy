import { prisma } from "@/lib/db";
import { notifyAdmin, EVENTS } from "@/lib/realtime";

/**
 * Marca o lead como atendido e avisa o admin. Compartilhado pelas duas formas
 * de atender: WhatsApp/copiar número (/atender) e extensão (/atender-hook).
 */
export async function markLeadAttended(
  leadId: string,
  operatorId: string,
  templateId?: string
) {
  const [updated] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        serviceStatus: "ATTENDED",
        attendedAt: new Date(),
        usedTemplateId: templateId,
      },
    }),
    prisma.leadEvent.create({
      data: { leadId, operatorId, action: "ATTENDED" },
    }),
    prisma.user.update({
      where: { id: operatorId },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  await notifyAdmin(EVENTS.leadAttended, {
    ...updated,
    value: updated.value ? Number(updated.value) : null,
  });

  return updated;
}
