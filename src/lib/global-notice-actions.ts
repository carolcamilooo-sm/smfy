"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";
import { NOTICE_ID, NOTICE_LIMITE } from "@/lib/global-notice";

export async function saveGlobalNotice(formData: FormData) {
  await requireDashboardAccess();
  const session = await auth();

  const content = String(formData.get("content") ?? "")
    .trim()
    .slice(0, NOTICE_LIMITE);

  // Recado vazio apaga o mural em vez de mostrar uma caixa em branco pra
  // equipe inteira. É também como se "desliga" o aviso, sem precisar de botão.
  if (!content) {
    await prisma.globalNotice.deleteMany({ where: { id: NOTICE_ID } });
  } else {
    await prisma.globalNotice.upsert({
      where: { id: NOTICE_ID },
      update: { content, authorName: session?.user.name ?? null },
      create: { id: NOTICE_ID, content, authorName: session?.user.name ?? null },
    });
  }

  // Os dois painéis: o aviso vive na barra lateral, que é layout de ambos.
  revalidatePath("/dashboard", "layout");
  revalidatePath("/atendimento", "layout");
}
