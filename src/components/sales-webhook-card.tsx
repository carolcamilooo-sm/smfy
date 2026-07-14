"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

const GATEWAYS = [
  { key: "kiwify", label: "Kiwify" },
  { key: "perfectpay", label: "PerfectPay" },
  { key: "disrupty", label: "Disrupty" },
  { key: "smpay", label: "SMPay" },
  { key: "payt", label: "PayT" },
] as const;

export function SalesWebhookCard({
  baseUrl,
  token,
  approvedCount,
  pendingCount,
  generateToken,
}: {
  baseUrl: string;
  token: string | null;
  approvedCount: number;
  pendingCount: number;
  generateToken: () => void;
}) {
  const [activeGateway, setActiveGateway] = useState<(typeof GATEWAYS)[number]["key"]>("kiwify");

  if (!token) {
    return (
      <div>
        <p className="mb-3 text-xs text-secondary">
          Gere um link e cadastre no gateway em que você recebe suas vendas
          (como afiliado ou produtor) — cada venda aprovada confirmada por
          esse link conta pro seu número no ranking. Vendas pendentes também
          ficam registradas aqui, marcadas como pendentes.
        </p>
        <form action={generateToken}>
          <Button type="submit" variant="secondary">
            Gerar link de webhook
          </Button>
        </form>
      </div>
    );
  }

  const url = `${baseUrl}/api/webhooks/operator-sales/${activeGateway}?token=${token}`;

  return (
    <div>
      <p className="mb-3 text-xs text-secondary">
        <span className="font-mono font-semibold text-success">{approvedCount}</span>{" "}
        aprovada(s){" "}
        <span className="text-muted">·</span>{" "}
        <span className="font-mono font-semibold text-warning">{pendingCount}</span>{" "}
        pendente(s) registrada(s) por esse link até agora.
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border pb-3">
        {GATEWAYS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setActiveGateway(g.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              activeGateway === g.key
                ? "bg-accent text-app"
                : "bg-surface text-secondary hover:text-primary"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <span className="mb-1 block text-[11px] text-muted">URL do webhook</span>
      <div className="flex gap-1.5">
        <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-secondary">
          {url}
        </code>
        <CopyButton value={url} />
      </div>
      <form action={generateToken} className="mt-3">
        <Button type="submit" variant="secondary">
          Gerar novo link
        </Button>
      </form>
    </div>
  );
}
