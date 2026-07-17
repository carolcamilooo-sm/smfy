import { normalizeDocument } from "./types";
import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

type DisruptySaleItem = {
  title?: string;
  isServiceFee?: boolean;
};

/** Os dados da venda vêm aninhados em `sale`, não no nível raiz do payload. */
type DisruptySale = {
  id?: number | string;
  transactionId?: number | string;
  amount?: number | string;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerDocument?: string;
  saleItems?: DisruptySaleItem[];
};

type DisruptyPayload = {
  integrationType?: string;
  sale?: DisruptySale;
};

/** Vocabulário de status da Disrupty, em português. */
const STATUS_MAP: Partial<Record<string, NormalizedPaymentStatus>> = {
  PENDENTE: "PENDING",
  EM_PROCESSAMENTO: "PENDING",
  PAGO: "APPROVED",
  RECUSADO: "DECLINED",
  CANCELADO: "DECLINED",
  FALHA: "DECLINED",
  ESTORNADO: "OTHER",
  REEMBOLSO_PENDENTE: "OTHER",
};

export const disruptyAdapter: GatewayAdapter = {
  parseWebhook(rawBody) {
    const data = JSON.parse(rawBody) as DisruptyPayload;

    // O payload real embrulha a venda num envelope com `sale`. Sem esse objeto
    // não é um evento de venda (saque, por exemplo) — ignora.
    const sale = data.sale;
    if (!sale) return null;

    const paymentStatus = STATUS_MAP[sale.status ?? ""];
    if (!paymentStatus) return null;

    const externalId = sale.id ?? sale.transactionId;
    if (externalId === undefined || externalId === null) return null;

    const phone = sale.customerPhone;
    if (!phone) return null;

    // amount vem em centavos, como string ("3464") ou número.
    const amount = typeof sale.amount === "string" ? Number(sale.amount) : sale.amount;
    const value =
      typeof amount === "number" && Number.isFinite(amount) ? amount / 100 : undefined;

    // O primeiro saleItem costuma ser a taxa quando isServiceFee é true; pega o
    // produto de verdade.
    const item = sale.saleItems?.find((i) => !i.isServiceFee) ?? sale.saleItems?.[0];

    const lead: NormalizedLead = {
      externalId: String(externalId),
      customerName: sale.customerName ?? "Sem nome",
      phone: String(phone),
      email: sale.customerEmail,
      document: normalizeDocument(sale.customerDocument),
      product: item?.title,
      value,
      paymentStatus,
    };
    return lead;
  },

  // Disrupty não assina os webhooks (sem HMAC) — o token da query string é a
  // fronteira de autenticação, como recomenda a doc deles.
};
