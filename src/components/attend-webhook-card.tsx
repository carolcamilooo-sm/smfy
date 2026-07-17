"use client";

import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

export function AttendWebhookCard({
  url,
  saveUrl,
}: {
  url: string | null;
  saveUrl: (formData: FormData) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-xs text-secondary">
        Cole aqui a URL de webhook da sua extensão. Com ela preenchida, cada
        lead da sua fila ganha o botão <strong>Atender por hook</strong>: o lead
        é enviado pra sua extensão e só é marcado como atendido se ela confirmar
        o recebimento. Deixe em branco pra desligar.
      </p>
      <p className="mb-3 text-[11px] text-muted">
        Enviamos: nome, telefone, e-mail, CPF, produto (nome, código e sigla),
        produtor, valor, status do pagamento e a mensagem já montada.
      </p>
      <form action={saveUrl} className="flex gap-1.5">
        <div className="min-w-0 flex-1">
          <span className="mb-1 block text-[11px] text-muted">
            URL do webhook da extensão
          </span>
          <Input
            name="url"
            type="url"
            defaultValue={url ?? ""}
            placeholder="https://sua-extensao.com/webhook"
            className="font-mono text-[11px]"
          />
        </div>
        <SubmitButton variant="secondary" className="self-end">
          Salvar
        </SubmitButton>
      </form>
      <p className="mt-2 text-[11px] text-muted">
        Quem chama essa URL é o servidor do SMFY, não o seu navegador — então
        ela precisa estar acessível pela internet. Endereço local
        (<code className="font-mono">localhost</code>) não funciona.
      </p>
    </div>
  );
}
