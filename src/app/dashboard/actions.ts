"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeDashboardLayout, type DashboardBlockKey } from "@/lib/dashboard-layout";

export async function updateDashboardLayout(order: DashboardBlockKey[]) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("unauthorized");
  }

  const layout = normalizeDashboardLayout(order);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardLayout: layout },
  });
}
