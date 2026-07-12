import type { GatewayAdapter } from "./types";
import { kiwifyAdapter } from "./kiwify";
import { smpayAdapter } from "./smpay";
import { perfectpayAdapter } from "./perfectpay";
import { createGenericAdapter } from "./generic";

export type GatewayKey = "kiwify" | "perfectpay" | "disrupty" | "smpay";

export const GATEWAY_ADAPTERS: Record<GatewayKey, GatewayAdapter> = {
  kiwify: kiwifyAdapter,
  perfectpay: perfectpayAdapter,
  disrupty: createGenericAdapter("disrupty"),
  smpay: smpayAdapter,
};

export function isGatewayKey(value: string): value is GatewayKey {
  return value in GATEWAY_ADAPTERS;
}

export const GATEWAY_DB_VALUE: Record<GatewayKey, "KIWIFY" | "PERFECTPAY" | "DISRUPTY" | "SMPAY"> = {
  kiwify: "KIWIFY",
  perfectpay: "PERFECTPAY",
  disrupty: "DISRUPTY",
  smpay: "SMPAY",
};

/** Only gateways with a documented per-webhook secret get a per-producer override field. */
export const GATEWAY_SECRET_FIELD: Partial<
  Record<GatewayKey, "smpayWebhookSecret" | "kiwifyWebhookSecret">
> = {
  smpay: "smpayWebhookSecret",
  kiwify: "kiwifyWebhookSecret",
};
