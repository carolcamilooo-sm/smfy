import type { GatewayAdapter } from "./types";
import { kiwifyAdapter } from "./kiwify";
import { smpayAdapter } from "./smpay";
import { perfectpayAdapter } from "./perfectpay";
import { paytAdapter } from "./payt";
import { disruptyAdapter } from "./disrupty";

export type GatewayKey = "kiwify" | "perfectpay" | "disrupty" | "smpay" | "payt";

export const GATEWAY_ADAPTERS: Record<GatewayKey, GatewayAdapter> = {
  kiwify: kiwifyAdapter,
  perfectpay: perfectpayAdapter,
  disrupty: disruptyAdapter,
  smpay: smpayAdapter,
  payt: paytAdapter,
};

export function isGatewayKey(value: string): value is GatewayKey {
  return value in GATEWAY_ADAPTERS;
}

export const GATEWAY_DB_VALUE: Record<
  GatewayKey,
  "KIWIFY" | "PERFECTPAY" | "DISRUPTY" | "SMPAY" | "PAYT"
> = {
  kiwify: "KIWIFY",
  perfectpay: "PERFECTPAY",
  disrupty: "DISRUPTY",
  smpay: "SMPAY",
  payt: "PAYT",
};

/** Only gateways with a documented per-webhook secret/token get a per-producer override field. */
export const GATEWAY_SECRET_FIELD: Partial<
  Record<GatewayKey, "smpayWebhookSecret" | "kiwifyWebhookSecret" | "perfectpayToken" | "paytIntegrationKey">
> = {
  smpay: "smpayWebhookSecret",
  kiwify: "kiwifyWebhookSecret",
  perfectpay: "perfectpayToken",
  payt: "paytIntegrationKey",
};
