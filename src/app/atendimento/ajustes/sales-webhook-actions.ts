"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function generateSalesWebhookToken() {
  const session = await auth();
  if (!session) throw new Error("unauthorized");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { salesWebhookToken: randomBytes(16).toString("hex") },
  });

  revalidatePath("/atendimento/ajustes");
}
