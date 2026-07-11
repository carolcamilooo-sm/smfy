"use client";

import { Button } from "@/components/ui/button";
import { fillTemplate } from "@/lib/template";
import { buildWhatsAppUrl } from "@/lib/phone";

export function ReatenderButton({
  phone,
  customerName,
  product,
  templateContent,
}: {
  phone: string;
  customerName: string;
  product: string | null;
  templateContent: string | null;
}) {
  function handleClick() {
    const content = templateContent ?? "Olá {{nome}}! Tudo bem?";
    const message = fillTemplate(content, { nome: customerName, produto: product });
    const url = buildWhatsAppUrl(phone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button variant="secondary" onClick={handleClick}>
      Reatender
    </Button>
  );
}
