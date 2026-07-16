import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeDocument } from "./types";
import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

type SMPayCustomer = {
  name?: string;
  email?: string;
  phone?: string | null;
  document?: string;
};

type SMPayData = {
  transaction_id?: string;
  cart_id?: string;
  product_name?: string;
  customer?: SMPayCustomer;
  gross_amount?: number;
  offer_price?: number;
  buyer_name?: string;
  buyer_phone?: string | null;
};

type SMPayEnvelope = {
  event: string;
  data?: SMPayData;
};

/** Only events that carry a customer phone can be routed to WhatsApp follow-up. */
const EVENT_STATUS: Partial<Record<string, NormalizedPaymentStatus>> = {
  sale_approved: "APPROVED",
  subscription_renewed: "APPROVED",
  pix_generated: "PENDING",
  boleto_generated: "PENDING",
  sale_refused: "DECLINED",
  cart_abandoned: "DECLINED",
  refund_completed: "OTHER",
  chargeback_received: "OTHER",
};

/** Recursively sorts object keys so JSON.stringify matches SMPay's canonical form used for signing. */
function canonicalJSON(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`).join(",")}}`;
}

export const smpayAdapter: GatewayAdapter = {
  parseWebhook(rawBody) {
    const payload = JSON.parse(rawBody) as SMPayEnvelope;
    const paymentStatus = EVENT_STATUS[payload.event];
    if (!paymentStatus) return null;

    const data = payload.data ?? {};
    const isCart = payload.event === "cart_abandoned";

    const externalId = isCart ? data.cart_id : data.transaction_id;
    if (!externalId) return null;

    const phone = isCart ? data.buyer_phone : data.customer?.phone;
    if (!phone) return null;

    const lead: NormalizedLead = {
      externalId: String(externalId),
      customerName: String((isCart ? data.buyer_name : data.customer?.name) ?? "Sem nome"),
      phone: String(phone),
      email: isCart ? undefined : data.customer?.email,
      document: isCart ? undefined : normalizeDocument(data.customer?.document),
      product: data.product_name,
      value:
        typeof data.gross_amount === "number"
          ? data.gross_amount
          : typeof data.offer_price === "number"
            ? data.offer_price
            : undefined,
      paymentStatus,
    };
    return lead;
  },

  verifySignature(rawBody, headers, _url, producerSecret) {
    const secret = producerSecret || process.env.SMPAY_WEBHOOK_SECRET;
    if (!secret) return true; // signature check skipped until a secret is configured

    const signatureHeader = headers.get("x-signature");
    if (!signatureHeader) {
      console.warn("[webhook:smpay] missing X-Signature header");
      return false;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch (err) {
      console.warn(
        `[webhook:smpay] rawBody failed JSON.parse in verifySignature: ${err instanceof Error ? err.message : err}. rawBody length=${rawBody.length}, first 100 chars: ${rawBody.slice(0, 100)}`
      );
      return false;
    }

    const canonical = canonicalJSON(parsed);
    const expected = createHmac("sha256", secret).update(canonical).digest("hex");
    const provided = signatureHeader.replace(/^sha256=/, "");

    let a: Buffer;
    let b: Buffer;
    try {
      a = Buffer.from(expected, "hex");
      b = Buffer.from(provided, "hex");
    } catch (err) {
      console.warn(`[webhook:smpay] signature header isn't valid hex: "${signatureHeader}" (${err instanceof Error ? err.message : err})`);
      return false;
    }
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      console.warn(
        `[webhook:smpay] signature mismatch. expected=${expected.slice(0, 12)}... provided=${provided.slice(0, 12)}... secretSource=${producerSecret ? "producer" : "env"} bodyLen=${rawBody.length}`
      );
      return false;
    }
    return true;
  },
};
