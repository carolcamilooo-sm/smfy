export type NormalizedPaymentStatus = "APPROVED" | "PENDING" | "DECLINED" | "OTHER";

export type NormalizedLead = {
  externalId: string;
  customerName: string;
  phone: string;
  email?: string;
  /** CPF/CNPJ do comprador, só dígitos. Cada gateway chama de um jeito. */
  document?: string;
  product?: string;
  value?: number;
  paymentStatus: NormalizedPaymentStatus;
};

/** Mantém só os dígitos — os gateways mandam ora "123.456.789-00", ora cru. */
export function normalizeDocument(raw: unknown): string | undefined {
  if (typeof raw !== "string" && typeof raw !== "number") return undefined;
  const digits = String(raw).replace(/\D/g, "");
  return digits.length > 0 ? digits : undefined;
}

export interface GatewayAdapter {
  /** Returns null when the event isn't relevant to lead tracking (should be ack'd and ignored). */
  parseWebhook(rawBody: string, headers: Headers): NormalizedLead | null;
  /** `producerSecret` is the per-producer override, when the gateway issues one secret per webhook. */
  verifySignature?(
    rawBody: string,
    headers: Headers,
    url: URL,
    producerSecret?: string | null
  ): boolean;
}
