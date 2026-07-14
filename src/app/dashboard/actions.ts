"use server";

import { prisma } from "@/lib/db";
import {
  normalizeDashboardLayout,
  normalizeDashboardWidths,
  type DashboardBlockKey,
  type DashboardBlockWidth,
} from "@/lib/dashboard-layout";
import { requireDashboardAccess } from "@/lib/access";

export async function updateDashboardLayout(order: DashboardBlockKey[]) {
  const session = await requireDashboardAccess();

  const layout = normalizeDashboardLayout(order);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardLayout: layout },
  });
}

export async function updateDashboardBlockWidth(key: DashboardBlockKey, width: DashboardBlockWidth) {
  const session = await requireDashboardAccess();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { dashboardBlockWidths: true },
  });
  const widths = normalizeDashboardWidths(user.dashboardBlockWidths);
  widths[key] = width;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { dashboardBlockWidths: widths },
  });
}
