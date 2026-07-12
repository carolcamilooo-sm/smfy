import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

type PerfectPayPayload = {
  code?: string;
  sale_amount?: number;
  sale_status_enum?: number;
  product?: { name?: string };
  customer?: {
    full_name?: string;
    email?: string;
    phone_area_code?: string;
    phone_number?: string;
  };
};

/**
 * sale_status_enum reference (from PerfectPay's docs):
 * 0 none, 1 pending, 2 approved, 3 in_process, 4 in_mediation, 5 rejected,
 * 6 cancelled, 7 refunded, 8 authorized, 9 charged_back, 10 completed,
 * 11 checkout_error, 12 precheckout (abandoned cart), 13 expired, 16 in_review.
 */
const STATUS_MAP: Partial<Record<number, NormalizedPaymentStatus>> = {
  1: "PENDING",
  2: "APPROVED",
  3: "PENDING",
  4: "OTHER",
  5: "DECLINED",
  6: "DECLINED",
  7: "OTHER",
  8: "APPROVED",
  9: "OTHER",
  10: "APPROVED",
  11: "DECLINED",
  12: "DECLINED",
  13: "DECLINED",
  16: "PENDING",
};

export const perfectpayAdapter: GatewayAdapter = {
  parseWebhook(rawBody) {
    const data = JSON.parse(rawBody) as PerfectPayPayload;

    const paymentStatus = STATUS_MAP[data.sale_status_enum ?? 0];
    if (!paymentStatus) return null;

    const externalId = data.code;
    if (!externalId) return null;

    const areaCode = data.customer?.phone_area_code;
    const number = data.customer?.phone_number;
    if (!areaCode || !number) return null;

    const lead: NormalizedLead = {
      externalId,
      customerName: data.customer?.full_name ?? "Sem nome",
      phone: `${areaCode}${number}`,
      email: data.customer?.email,
      product: data.product?.name,
      value: typeof data.sale_amount === "number" ? data.sale_amount : undefined,
      paymentStatus,
    };
    return lead;
  },
};
