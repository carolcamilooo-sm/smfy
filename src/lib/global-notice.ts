import { prisma } from "@/lib/db";

/** Uma linha só: o mural tem sempre o recado atual, e nada mais. */
export const NOTICE_ID = "global";

export const NOTICE_LIMITE = 500;

/**
 * Leitura fica fora do arquivo de ações de propósito: tudo que é exportado de
 * um módulo "use server" vira endpoint público, e não há motivo pra expor a
 * leitura do mural na rede.
 */
export async function getGlobalNotice() {
  return prisma.globalNotice.findUnique({ where: { id: NOTICE_ID } });
}
