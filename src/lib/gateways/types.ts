export type NormalizedPaymentStatus = "APPROVED" | "PENDING" | "DECLINED" | "OTHER";

export type NormalizedLead = {
  externalId: string;
  customerName: string;
  phone: string;
  email?: string;
  product?: string;
  value?: number;
  paymentStatus: NormalizedPaymentStatus;
};

export interface GatewayAdapter {
  /** Returns null when the event isn't relevant to lead tracking (should be ack'd and ignored). */
  parseWebhook(rawBody: string, headers: Headers): NormalizedLead | null;
  verifySignature?(
    rawBody: string,
    headers: Headers,
    url: URL
  ): boolean;
}
