import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

type KiwifyPayload = {
  order_id?: string;
  order_ref?: string;
  order_status?: string;
  Product?: { product_name?: string };
  Customer?: {
    full_name?: string;
    email?: string;
    mobile?: string;
    phone?: string;
  };
  Commissions?: { charge_amount?: number };
  product_base_price?: number;
};

function mapStatus(orderStatus: string | undefined): NormalizedPaymentStatus {
  switch (orderStatus) {
    case "paid":
    case "approved":
      return "APPROVED";
    case "waiting_payment":
    case "pix_created":
    case "billet_created":
      return "PENDING";
    case "refused":
      return "DECLINED";
    default:
      return "OTHER";
  }
}

export const kiwifyAdapter: GatewayAdapter = {
  parseWebhook(rawBody) {
    const data = JSON.parse(rawBody) as KiwifyPayload;

    const externalId = data.order_id ?? data.order_ref;
    if (!externalId) return null;

    const phone = data.Customer?.mobile ?? data.Customer?.phone;
    if (!phone) return null;

    const rawValue = data.Commissions?.charge_amount ?? data.product_base_price;

    const lead: NormalizedLead = {
      externalId,
      customerName: data.Customer?.full_name ?? "Sem nome",
      phone,
      email: data.Customer?.email,
      product: data.Product?.product_name,
      value: typeof rawValue === "number" ? rawValue / 100 : undefined,
      paymentStatus: mapStatus(data.order_status),
    };
    return lead;
  },

  verifySignature(rawBody, _headers, url) {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET;
    if (!secret) return true; // signature check skipped until secret is configured

    const signature = url.searchParams.get("signature");
    if (!signature) return false;

    const expected = createHmac("sha1", secret).update(rawBody).digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};
