import { timingSafeEqual } from "node:crypto";
import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

type PayTPayload = {
  integration_key?: string;
  transaction_id?: string;
  test?: boolean;
  type?: "order" | "upsell" | "manual_upsell" | "abandoned-cart" | "cash_on_delivery";
  customer?: {
    name?: string;
    email?: string;
    fake_email?: boolean;
    phone?: string;
  };
  product?: { name?: string };
  transaction?: {
    payment_status?: string;
    total_price?: number;
  };
};

/** transaction.payment_status reference from PayT's postback docs. */
const STATUS_MAP: Partial<Record<string, NormalizedPaymentStatus>> = {
  waiting_payment: "PENDING",
  paid: "APPROVED",
  reprocessed: "APPROVED",
  refused: "DECLINED",
  one_click_buy_refused: "DECLINED",
  canceled: "DECLINED",
  // Pix/boleto que o cliente gerou e não pagou até vencer. Não é recusa do
  // banco — é justamente o lead a recuperar, então entra como pendente.
  expired: "PENDING",
  chargeback_presented: "OTHER",
  chargeback: "OTHER",
  peding_refund: "OTHER", // typo is PayT's own — that's the literal value they send
  one_click_buy_refunded: "OTHER",
  refunded: "OTHER",
  one_click_buy_refunded_partial: "OTHER",
  refunded_partial: "OTHER",
};

export const paytAdapter: GatewayAdapter = {
  parseWebhook(rawBody) {
    const data = JSON.parse(rawBody) as PayTPayload;

    if (data.test) return null; // homologation postback, not a real sale
    if (data.type === "abandoned-cart") return null; // no purchase happened

    const paymentStatus = STATUS_MAP[data.transaction?.payment_status ?? ""];
    if (!paymentStatus) return null;

    const externalId = data.transaction_id;
    if (!externalId) return null;

    const phone = data.customer?.phone;
    if (!phone) return null;

    const totalPrice = data.transaction?.total_price;

    const lead: NormalizedLead = {
      externalId,
      customerName: data.customer?.name ?? "Sem nome",
      phone,
      // PayT fills in a throwaway address when the buyer ticks "não tenho email"
      email: data.customer?.fake_email ? undefined : data.customer?.email,
      product: data.product?.name,
      value: typeof totalPrice === "number" ? totalPrice / 100 : undefined,
      paymentStatus,
    };
    return lead;
  },

  /** PayT has no HMAC scheme — it just echoes a static "integration_key" in the payload body. */
  verifySignature(rawBody, _headers, _url, producerSecret) {
    if (!producerSecret) return true; // skipped until a key is configured

    let data: PayTPayload;
    try {
      data = JSON.parse(rawBody) as PayTPayload;
    } catch {
      return false;
    }
    if (!data.integration_key) return false;

    const a = Buffer.from(data.integration_key);
    const b = Buffer.from(producerSecret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};
