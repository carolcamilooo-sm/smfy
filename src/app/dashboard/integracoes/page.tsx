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
    status: "generic" as const,
    description:
      "Parser genérico: tenta reconhecer os campos mais comuns (id, status, cliente, telefone, produto, valor). Envie um payload de exemplo real para eu ajustar o parser específico.",
  },
];

export default function IntegracoesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold">Integrações</h1>
        <p className="text-xs text-neutral-500">
          Gateways de pagamento suportados. O link de webhook de cada um é
          gerado por produtor —{" "}
          <Link href="/dashboard/produtores" className="text-brand underline">
            cadastre o produtor
          </Link>{" "}
          para pegar a URL certa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {GATEWAYS.map((gw) => (
          <Card key={gw.name}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium">{gw.name}</h3>
              {gw.status === "complete" ? (
                <Badge tone="green">Parser completo</Badge>
              ) : (
                <Badge tone="yellow">Parser genérico</Badge>
              )}
            </div>
            <p className="text-xs text-neutral-400">{gw.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
