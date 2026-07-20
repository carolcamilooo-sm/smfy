"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import { ConfirmForm } from "@/components/confirm-form";

type Action = (fd: FormData) => Promise<void>;

export function CompanySalesWebhookCard({
  gateway,
  label,
  url,
  temSegredo,
  gerar,
  salvarSegredo,
  remover,
}: {
  gateway: string;
  label: string;
  /** URL completa com o token, ou null se ainda não foi gerado. */
  url: string | null;
  temSegredo: boolean;
  gerar: Action;
  salvarSegredo: Action;
  remover: Action;
}) {
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-title">
        Vendas da empresa — {label}
      </h2>
      <p className="mb-4 text-xs text-secondary">
        Um endereço só, para a conta da empresa no {label}. A cada venda paga, o
        sistema procura o comprador entre os leads já distribuídos (por CPF,
        telefone ou e-mail) e credita a venda a quem atendeu por último antes da
        compra. O ranking se alimenta sozinho, sem ninguém configurar nada.
      </p>

      {!url ? (
        <form action={gerar}>
          <input type="hidden" name="gateway" value={gateway} />
          <SubmitButton savedMessage="Webhook criado">Gerar endereço</SubmitButton>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="mb-1 block text-[11px] text-muted">
              Cole este endereço no {label}, no evento de venda aprovada
            </span>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-app px-3 py-2 font-mono text-[11px] text-primary">
                {url}
              </code>
              <CopyButton value={url} label="Copiar" title="Copiar o endereço do webhook" />
            </div>
          </div>

          <form action={salvarSegredo} className="flex items-end gap-2">
            <input type="hidden" name="gateway" value={gateway} />
            <div className="min-w-0 flex-1">
              <span className="mb-1 block text-[11px] text-muted">
                Segredo de assinatura {temSegredo && "(já configurado — digite pra trocar)"}
              </span>
              <Input
                name="secret"
                type="password"
                placeholder={temSegredo ? "••••••••" : "Deixe vazio pra não conferir assinatura"}
                className="font-mono text-[11px]"
              />
            </div>
            <SubmitButton variant="secondary">Salvar</SubmitButton>
          </form>
          <p className="text-[11px] text-muted">
            Com o segredo preenchido, cada chamada é conferida contra a
            assinatura do gateway — sem ele, quem descobrir o endereço consegue
            inventar venda e mexer no ranking.
          </p>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <ConfirmForm
              action={gerar}
              confirmMessage="Gerar um endereço novo? O atual para de funcionar na hora, e você precisa atualizar no gateway."
            >
              <input type="hidden" name="gateway" value={gateway} />
              <Button type="submit" variant="secondary" className="py-1 text-xs">
                Gerar novo endereço
              </Button>
            </ConfirmForm>
            <ConfirmForm
              action={remover}
              confirmMessage="Desligar o webhook de vendas da empresa? As vendas param de alimentar o ranking."
            >
              <input type="hidden" name="gateway" value={gateway} />
              <Button type="submit" variant="danger" className="py-1 text-xs">
                Desligar
              </Button>
            </ConfirmForm>
          </div>
        </div>
      )}
    </Card>
  );
}
