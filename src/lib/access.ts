import { auth } from "@/auth";

export function canAccessDashboard(role: string) {
  return role === "ADMIN" || role === "COLLABORATOR";
}

/** Dashboard screens (Produtores, Equipe de Atendimento, Histórico etc.) — full access for admins and collaborators alike. */
export async function requireDashboardAccess() {
  const session = await auth();
  if (!session || !canAccessDashboard(session.user.role)) {
    throw new Error("unauthorized");
  }
  return session;
}

/** Account-owner-only actions, e.g. managing who else gets dashboard access. */
export async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("unauthorized");
  }
  return session;
}
