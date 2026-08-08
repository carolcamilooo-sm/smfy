import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Registra uma ação de gestão no log de atividade — SÓ para colaboradores
 * (papel COLLABORATOR). O que o dono (ADMIN) faz não é registrado, por escolha
 * de produto: o log serve pra acompanhar o time remoto.
 *
 * Nunca derruba a ação em si: se o registro falhar, vira só um console.error —
 * auditoria não pode ser motivo de uma ação de gestão falhar.
 */
export async function logActivity(action: string, summary: string): Promise<void> {
  try {
    const session = await auth();
    if (!session || session.user.role !== "COLLABORATOR") return;
    await prisma.activityLog.create({
      data: {
        actorId: session.user.id,
        actorName: session.user.name ?? "Colaborador",
        action,
        summary,
      },
    });
  } catch (err) {
    console.error("[activity-log] falha ao registrar atividade", err);
  }
}
