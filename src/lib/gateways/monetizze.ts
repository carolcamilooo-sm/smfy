import { normalizeDocument } from "./types";
import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

/**
 * O código do EVENTO vem em `postback_evento` (e também em tipoEvento.codigo).
 * Só os eventos do ciclo de venda avulsa viram lead aqui. Assinatura (101–106),
 * rastreio (120), ingresso (70), abandono (7) e internos são ignorados
 * (parseWebhook devolve null e o webhook é apenas confirmado).
 *
 * Recusado/cancelado (3) cai no balde de recuperação (DECLINED). Reembolso,
 * bloqueio e solicitação de reembolso são OTHER — não voltam pra fila.
 */
const STATUS_BY_EVENT: Record<number, NormalizedPaymentStatus> = {
  1: "PENDING", // Aguardando pagamento (boleto/Pix gerado)
  2: "APPROVED", // Finalizada / Aprovada
  6: "APPROVED", // Completa (garantia encerrada)
  3: "DECLINED", // Cancelada
  4: "OTHER", // Devolvida (Reembolso)
  5: "OTHER", // Bloqueada
  7: "PENDING", // Abandono de Checkout — entra como pendente pra recuperação
  9: "OTHER", // Solicitação de Reembolso
};

/** Código `rec=` da URL de recuperação — chave estável do carrinho abandonado. */
function recFromUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const m = v.match(/[?&]rec=([^&]+)/);
  return m ? m[1] : undefined;
}

/**
 * Monta objeto aninhado a partir de chaves com colchetes do x-www-form-urlencoded:
 * `venda[codigo]=1&comprador[nome]=Ana` -> { venda: { codigo: "1" }, comprador: { nome: "Ana" } }.
 */
function urlencodedToObject(body: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of new URLSearchParams(body)) {
    const path = rawKey.replace(/\]/g, "").split("[");
    let node = out;
    for (let i = 0; i < path.length - 1; i++) {
      const k = path[i];
      if (typeof node[k] !== "object" || node[k] === null) node[k] = {};
      node = node[k] as Record<string, unknown>;
    }
    node[path[path.length - 1]] = value;
  }
  return out;
}

/**
 * A Monetizze manda em JSON ou em x-www-form-urlencoded (o padrão do painel),
 * conforme a configuração do produtor. Este parser aceita os dois.
 */
function parseBody(rawBody: string, headers: Headers): Record<string, unknown> {
  const ct = (headers.get("content-type") ?? "").toLowerCase();
  const looksJson = ct.includes("application/json") || rawBody.trimStart().startsWith("{");
  if (looksJson) {
    return JSON.parse(rawBody) as Record<string, unknown>;
  }
  const obj = urlencodedToObject(rawBody);
  // No urlencoded a Monetizze também manda um campo `json` com o payload
  // completo; quando vem, é mais confiável que a montagem por colchetes.
  if (typeof obj.json === "string") {
    try {
      return { ...obj, ...(JSON.parse(obj.json) as Record<string, unknown>) };
    } catch {
      /* mantém o objeto montado a partir dos colchetes */
    }
  }
  return obj;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export const monetizzeAdapter: GatewayAdapter = {
  parseWebhook(rawBody, headers) {
    const p = parseBody(rawBody, headers);

    const evento =
      num(p.postback_evento) ?? num(obj(p.tipoEvento).codigo) ?? num(p.codigo_status);
    if (evento === undefined) return null;

    const paymentStatus = STATUS_BY_EVENT[evento];
    if (!paymentStatus) return null; // evento fora do ciclo de venda avulsa

    const venda = obj(p.venda);
    const comprador = obj(p.comprador);
    const produto = obj(p.produto);

    // Abandono às vezes não traz codigo_venda ainda; o rec da URL de recuperação
    // serve de chave estável. Se depois virar venda de verdade, aquele evento
    // traz o codigo_venda e entra como o registro da compra.
    const externalId = String(p.codigo_venda ?? venda.codigo ?? recFromUrl(p.url_recuperacao) ?? "");
    if (!externalId) return null;

    const phone = comprador.telefone;
    if (!phone) return null; // sem telefone não dá pra trabalhar o lead no WhatsApp

    const lead: NormalizedLead = {
      externalId,
      customerName: String(comprador.nome ?? "Sem nome"),
      phone: String(phone),
      email: comprador.email ? String(comprador.email) : undefined,
      document: normalizeDocument(comprador.cnpj_cpf),
      product: produto.nome ? String(produto.nome) : undefined,
      productCode: produto.codigo != null ? String(produto.codigo) : undefined,
      value: num(venda.valor),
      paymentStatus,
    };
    return lead;
  },
};
