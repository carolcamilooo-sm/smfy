import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GATEWAYS = [
  {
    name: "Kiwify",
    description:
      "Parser completo: status de pagamento, cliente, produto e valor são lidos automaticamente. Suporta verificação de assinatura opcional (variável KIWIFY_WEBHOOK_SECRET).",
  },
  {
    name: "PerfectPay",
    description:
      "Parser completo: status da venda (aprovado, pendente, pagamento recusado, cancelado etc.), cliente, produto e valor são lidos automaticamente. Suporta verificação por public token, configurável por produtor em Produtores.",
  },
  {
    name: "Disrupty",
    description:
      "Parser completo: status da transação (pago, pendente, em processamento, recusado, cancelado, falha, estorno, reembolso pendente), cliente, produto e valor são lidos automaticamente, com pagamento recusado indo pro balde de recuperação. Eventos de saque são ignorados. A Disrupty não assina os webhooks — quem autentica a chamada é o token da própria URL.",
  },
  {
    name: "SMPay",
    description:
      "Parser completo: eventos de venda, PIX, boleto, reembolso e assinatura são lidos automaticamente, com pagamento recusado indo pro balde de recuperação. Suporta verificação de assinatura opcional (variável SMPAY_WEBHOOK_SECRET).",
  },
  {
    name: "PayT",
    description:
      "Parser completo: status da venda (aguardando pagamento, pago, recusado, cancelado, expirado, reembolso, chargeback), cliente, produto e valor são lidos automaticamente, com pagamento recusado indo pro balde de recuperação. Postbacks de teste e de carrinho abandonado são ignorados. Suporta verificação por integration key, configurável por produtor em Produtores.",
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
              <Badge tone="green">Parser completo</Badge>
            </div>
            <p className="text-xs leading-relaxed text-secondary">{gw.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
