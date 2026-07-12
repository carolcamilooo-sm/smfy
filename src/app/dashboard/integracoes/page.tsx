import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GATEWAYS = [
  {
    name: "Kiwify",
    status: "complete" as const,
    description:
      "Parser completo: status de pagamento, cliente, produto e valor são lidos automaticamente. Suporta verificação de assinatura opcional (variável KIWIFY_WEBHOOK_SECRET).",
  },
  {
    name: "PerfectPay",
    status: "generic" as const,
    description:
      "Parser genérico: tenta reconhecer os campos mais comuns (id, status, cliente, telefone, produto, valor). Envie um payload de exemplo real para eu ajustar o parser específico.",
  },
  {
    name: "Disrupty",
    status: "generic" as const,
    description:
      "Parser genérico: tenta reconhecer os campos mais comuns (id, status, cliente, telefone, produto, valor). Envie um payload de exemplo real para eu ajustar o parser específico.",
  },
  {
    name: "SMPay",
    status: "complete" as const,
    description:
      "Parser completo: eventos de venda, PIX, boleto, reembolso e assinatura são lidos automaticamente, com carrinho abandonado indo pro balde de recuperação. Suporta verificação de assinatura opcional (variável SMPAY_WEBHOOK_SECRET).",
  },
];

export default function IntegracoesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Integrações</h1>
        <p className="text-sm text-secondary">
          Gateways de pagamento conectados via webhook. O link de cada um é
          gerado por produtor —{" "}
          <Link href="/dashboard/produtores" className="text-accent hover:underline">
            cadastre o produtor
          </Link>{" "}
          para pegar a URL certa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GATEWAYS.map((gw) => (
          <Card key={gw.name}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-primary">{gw.name}</h3>
              {gw.status === "complete" ? (
                <Badge tone="green">Parser completo</Badge>
              ) : (
                <Badge tone="yellow">Parser genérico</Badge>
              )}
            </div>
            <p className="text-xs leading-relaxed text-secondary">{gw.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
