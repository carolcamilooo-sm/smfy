export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizePhone(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
