import type { GatewayAdapter, NormalizedLead, NormalizedPaymentStatus } from "./types";

/**
 * Best-effort adapter for gateways whose webhook payload shape we haven't
 * confirmed yet (PerfectPay, Disrupty, SMPay). It tries the most common
 * field names used by Brazilian payment gateways. Swap this out for a
 * precise parser (like kiwify.ts) once a real sample payload is available —
 * the full raw payload is always stored on the Lead for reference.
 */
function get(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      obj
    );
}

function firstDefined(obj: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

const APPROVED_WORDS = ["paid", "approved", "aprovado", "pago", "completed", "success"];
const PENDING_WORDS = ["pending", "pendente", "waiting", "aguardando", "processing", "created"];
const DECLINED_WORDS = ["declined", "recusado", "recusada", "refused", "failed"];

function mapStatus(raw: unknown): NormalizedPaymentStatus {
  const status = String(raw ?? "").toLowerCase();
  if (APPROVED_WORDS.some((w) => status.includes(w))) return "APPROVED";
  if (PENDING_WORDS.some((w) => status.includes(w))) return "PENDING";
  if (DECLINED_WORDS.some((w) => status.includes(w))) return "DECLINED";
  return "OTHER";
}

export function createGenericAdapter(gatewayName: string): GatewayAdapter {
  return {
    parseWebhook(rawBody) {
      const data = JSON.parse(rawBody);

      const externalId = firstDefined(data, [
        "id",
        "order_id",
        "sale_id",
        "transaction_id",
        "code",
        "reference",
      ]);
      const phone = firstDefined(data, [
        "customer.phone",
        "customer.mobile",
        "customer.whatsapp",
        "phone",
        "mobile",
        "buyer.phone",
      ]);

      if (!externalId || !phone) {
        console.warn(
          `[webhook:${gatewayName}] payload missing id/phone, ignoring. Raw: ${rawBody.slice(0, 300)}`
        );
        return null;
      }

      const statusRaw = firstDefined(data, [
        "status",
        "order_status",
        "sale_status",
        "payment_status",
      ]);

      const value = firstDefined(data, ["amount", "value", "total", "price"]);

      const lead: NormalizedLead = {
        externalId: String(externalId),
        customerName: String(
          firstDefined(data, ["customer.name", "customer.full_name", "buyer.name", "name"]) ??
            "Sem nome"
        ),
        phone: String(phone),
        email: firstDefined(data, ["customer.email", "buyer.email", "email"]) as
          | string
          | undefined,
        product: firstDefined(data, ["product.name", "product_name", "item.name"]) as
          | string
          | undefined,
        value: value !== undefined ? Number(value) : undefined,
        paymentStatus: mapStatus(statusRaw),
      };
      return lead;
    },
  };
}
