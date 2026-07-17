import { NextRequest, NextResponse } from "next/server";

/**
 * DIAGNÓSTICO TEMPORÁRIO. Loga o corpo cru de um webhook, sem parsear nem
 * descartar, pra a gente ver exatamente o que o gateway manda quando o lead
 * "não chega". Cadastre a URL do gateway apontando pra .../debug e olhe os
 * logs de produção. Remover assim que o formato for descoberto.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ gateway: string }> }
) {
  const { gateway } = await context.params;
  const raw = await request.text();
  const token = request.nextUrl.searchParams.get("token");
  // Loga se o ?token= veio (mascarado) e o corpo cru, pra distinguir de uma vez
  // "chegou sem token" (401 na rota real) de "chegou com formato inesperado".
  console.log(
    `[webhook-debug:${gateway}] token=${token ? token.slice(0, 6) + "…(" + token.length + ")" : "AUSENTE"} BODY: ${raw.slice(0, 4000)}`
  );
  return NextResponse.json({ ok: true, debug: true });
}
