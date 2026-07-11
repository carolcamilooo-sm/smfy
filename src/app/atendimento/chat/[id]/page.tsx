import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function paymentTypeBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Lead pago</Badge>;
  if (status === "PENDING") return <Badge tone="yellow">Pendente</Badge>;
  if (status === "DECLINED") return <Badge tone="red">Carrinho</Badge>;
  return <Badge tone="gray">Outro</Badge>;
}

export default async function WhatsAppChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { producer: { select: { name: true } } },
  });

  if (!lead || lead.assignedOperatorId !== session!.user.id) {
    notFound();
  }

  return (
    <div className="-mx-10 -my-8 flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface px-7 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-success/60 to-success/30" />
          <div>
            <p className="text-sm font-semibold text-primary">{lead.customerName}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-secondary">
                {lead.product
                  ? `${lead.product} — ${lead.producer?.name ?? "-"}`
                  : lead.producer?.name ?? "-"}
              </span>
              {paymentTypeBadge(lead.paymentStatus)}
            </div>
          </div>
        </div>
        <Link
          href="/atendimento"
          className="rounded-lg border border-border bg-surface-raised px-4 py-2 text-sm font-semibold text-secondary hover:text-primary"
        >
          Fechar
        </Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-7 py-5 text-center">
        <p className="text-sm font-medium text-secondary">
          Nenhuma mensagem por aqui ainda.
        </p>
        <p className="max-w-sm text-xs text-muted">
          Essa é uma prévia visual da conversa dentro do app — o envio e
          recebimento de mensagens ainda não está conectado à API oficial do
          WhatsApp Business. Pra falar com esse lead agora, use o botão
          &quot;Atender&quot; na fila, que abre o WhatsApp Web de verdade.
        </p>
      </div>

      <div className="flex items-end gap-3 border-t border-border bg-surface px-7 py-4">
        <input
          type="text"
          disabled
          placeholder="Envio ainda não conectado à API do WhatsApp Business..."
          className="flex-1 cursor-not-allowed rounded-lg border border-border bg-app px-3.5 py-3 text-sm text-muted placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg bg-surface-raised px-5 py-3 text-sm font-bold text-muted"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
