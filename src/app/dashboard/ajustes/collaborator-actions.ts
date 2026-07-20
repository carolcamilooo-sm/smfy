"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/access";

/**
 * Grants dashboard access (Produtores, Equipe de Atendimento, Integrações,
 * Histórico) without the account-owner powers of ADMIN — e.g. this action
 * itself stays ADMIN-only, so a collaborator can't create more collaborators.
 */
export type CollaboratorState = { error?: string; success?: string };

const PAPEL_LEGIVEL: Record<string, string> = {
  ADMIN: "administrador",
  COLLABORATOR: "colaborador",
  OPERATOR: "atendente",
};

/**
 * Devolve a mensagem em vez de lançar erro. Lançar dentro de uma ação de
 * servidor faz o Next mostrar "A server error occurred" com um código, e quem
 * está na tela não descobre que o problema era só um e-mail repetido.
 */
export async function createCollaborator(
  _prev: CollaboratorState,
  formData: FormData
): Promise<CollaboratorState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email) return { error: "Preencha nome e e-mail." };
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { role: true, name: true },
  });
  if (existing) {
    // Dizer QUEM já usa o e-mail evita a caçada: quase sempre é um atendente
    // que já está cadastrado, e não outro colaborador.
    const papel = PAPEL_LEGIVEL[existing.role] ?? "usuário";
    return {
      error: `Este e-mail já é de ${existing.name}, cadastrado como ${papel}. Use outro e-mail.`,
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "COLLABORATOR",
      approvalStatus: "APPROVED",
    },
  });

  revalidatePath("/dashboard/ajustes");
  return { success: `${name} agora tem acesso ao painel.` };
}

export async function removeCollaborator(formData: FormData) {
  await requireAdmin();

  const collaboratorId = String(formData.get("collaboratorId"));
  await prisma.user.delete({ where: { id: collaboratorId, role: "COLLABORATOR" } });

  revalidatePath("/dashboard/ajustes");
}
