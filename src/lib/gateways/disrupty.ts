import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

type DisruptySaleItem = {
  title?: string;
};

type DisruptyPayload = {
  id?: number | string;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  saleItems?: DisruptySaleItem[];
  transactionId?: number | string;
  type?: "TRANSACTION" | "WITHDRAWAL";
};

/** Disrupty's own status vocabulary for a TRANSACTION event, in Portuguese. */
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

    if (data.type !== "TRANSACTION") return null; // WITHDRAWAL events aren't sales

    const paymentStatus = STATUS_MAP[data.status ?? ""];
    if (!paymentStatus) return null;

    const externalId = data.id ?? data.transactionId;
    if (externalId === undefined || externalId === null) return null;

    const phone = data.customerPhone;
    if (!phone) return null;

    const lead: NormalizedLead = {
      externalId: String(externalId),
      customerName: data.customerName ?? "Sem nome",
      phone: String(phone),
      email: data.customerEmail,
      product: data.saleItems?.[0]?.title,
      value: typeof data.amount === "number" ? data.amount / 100 : undefined,
      paymentStatus,
    };
    return lead;
  },

  // Disrupty doesn't sign webhooks (no HMAC) — per their docs, the query-string
  // token this app already requires on every webhook URL is the auth boundary.
};
