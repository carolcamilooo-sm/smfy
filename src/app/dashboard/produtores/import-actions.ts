"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireDashboardAccess } from "@/lib/access";
import { lerPlanilhaDisrupty } from "@/lib/import-disrupty";

export type ResumoImportacao = {
  erro?: string;
  colunas?: string[];
  total?: number;
  novos?: number;
  jaExistem?: number;
  porTipo?: { aprovados: number; pendentes: number; recusados: number; outros: number };
  problemas?: { linha: number; motivo: string; conteudo: string }[];
  /** O conteúdo do arquivo, devolvido pra o passo de confirmar reenviar. */
  csv?: string;
  /** Preenchido só depois de confirmar. */
  importados?: number;
};

/**
 * Cabe folgado num export diário (mil linhas dão uns 100 KB) e fica abaixo do
 * limite de corpo de uma ação de servidor.
 */
const LIMITE_BYTES = 900_000;

async function contar(producerId: string, texto: string) {
  const leitura = lerPlanilhaDisrupty(texto);
  const existentes = await prisma.lead.findMany({
    where: {
      producerId,
      gateway: "DISRUPTY",
      externalId: { in: leitura.validas.map((v) => v.externalId) },
    },
    select: { externalId: true },
  });
  const jaTem = new Set(existentes.map((e) => e.externalId));
  return { leitura, jaTem, novos: leitura.validas.filter((v) => !jaTem.has(v.externalId)) };
}

/** Passo 1: lê, compara com o que já existe e devolve o resumo. Não grava. */
export async function analisarPlanilha(
  _prev: ResumoImportacao,
  formData: FormData
): Promise<ResumoImportacao> {
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId") ?? "");
  if (!producerId) return { erro: "Escolha o produtor dono desses leads." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { erro: "Escolha um arquivo .csv exportado da Disrupty." };
  }
  if (file.size > LIMITE_BYTES) {
    return { erro: "Arquivo muito grande. Exporte em partes de até ~5 mil linhas." };
  }

  const texto = await file.text();
  const { leitura, jaTem, novos } = await contar(producerId, texto);

  if (leitura.validas.length === 0 && leitura.problemas.length === 0) {
    return {
      erro:
        "Não consegui ler nenhuma linha. Confira se o arquivo é o export de vendas da Disrupty — as colunas esperadas são ID, Data, Cliente, Telefone, Valor Bruto e Status.",
      colunas: leitura.colunasEncontradas,
    };
  }

  return {
    colunas: leitura.colunasEncontradas,
    total: leitura.validas.length + leitura.problemas.length,
    novos: novos.length,
    jaExistem: jaTem.size,
    porTipo: {
      aprovados: novos.filter((v) => v.paymentStatus === "APPROVED").length,
      pendentes: novos.filter((v) => v.paymentStatus === "PENDING").length,
      recusados: novos.filter((v) => v.paymentStatus === "DECLINED").length,
      outros: novos.filter((v) => v.paymentStatus === "OTHER").length,
    },
    problemas: leitura.problemas.slice(0, 12),
    // Volta pro navegador pra o passo de confirmar reenviar exatamente o mesmo
    // conteúdo — evita depender do arquivo continuar selecionado.
    csv: texto,
  };
}

/** Passo 2: grava. Ação separada de propósito, sem sinalização a interpretar. */
export async function importarPlanilha(
  _prev: ResumoImportacao,
  formData: FormData
): Promise<ResumoImportacao> {
  await requireDashboardAccess();

  const producerId = String(formData.get("producerId") ?? "");
  const texto = String(formData.get("csv") ?? "");
  if (!producerId || !texto) return { erro: "Confira a planilha de novo antes de importar." };

  const productId = String(formData.get("productId") ?? "") || null;
  const produto = productId
    ? await prisma.product.findFirst({
        where: { id: productId, producerId },
        select: { id: true, name: true },
      })
    : null;

  const { leitura, jaTem, novos } = await contar(producerId, texto);

  if (novos.length > 0) {
    // createMany numa tacada: distribuir um por um aqui estouraria o tempo da
    // requisição numa planilha grande. Entram como em espera, e o mesmo
    // mecanismo que já resgata lead parado entrega conforme houver atendente.
    await prisma.lead.createMany({
      data: novos.map((v) => ({
        producerId,
        gateway: "DISRUPTY" as const,
        externalId: v.externalId,
        customerName: v.customerName,
        phone: v.phone,
        document: v.document,
        email: v.email,
        product: produto?.name ?? null,
        productId: produto?.id ?? null,
        value: v.value,
        paymentStatus: v.paymentStatus,
        serviceStatus: "WAITING" as const,
        createdAt: v.createdAt,
        rawPayload: { origem: "planilha-disrupty", externalId: v.externalId },
      })),
      // Corrida com o webhook: se o mesmo lead entrar por lá no meio da
      // importação, a chave única barra e a linha é ignorada em vez de estourar.
      skipDuplicates: true,
    });
  }

  revalidatePath("/dashboard/produtores");
  revalidatePath("/dashboard/historico");

  return {
    importados: novos.length,
    jaExistem: jaTem.size,
    problemas: leitura.problemas.slice(0, 12),
  };
}
