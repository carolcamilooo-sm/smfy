import type { GatewayAdapter } from "./types";
import { kiwifyAdapter } from "./kiwify";
import { smpayAdapter } from "./smpay";
import { createGenericAdapter } from "./generic";

export type GatewayKey = "kiwify" | "perfectpay" | "disrupty" | "smpay";

export const GATEWAY_ADAPTERS: Record<GatewayKey, GatewayAdapter> = {
  kiwify: kiwifyAdapter,
  perfectpay: createGenericAdapter("perfectpay"),
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
