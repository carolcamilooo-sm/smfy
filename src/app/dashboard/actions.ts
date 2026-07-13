"use server";

import { prisma } from "@/lib/db";
import { normalizeDashboardLayout, type DashboardBlockKey } from "@/lib/dashboard-layout";
import { requireDashboardAccess } from "@/lib/access";

export async function updateDashboardLayout(order: DashboardBlockKey[]) {
  const session = await requireDashboardAccess();

  const layout = normalizeDashboardLayout(order);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardLayout: layout },
  });
}
