import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";

export const dynamic = "force-dynamic";

const textareaClass =
  "w-full rounded-lg border border-border bg-app px-3.5 py-3 text-sm text-primary focus:border-accent focus:outline-none";

/** Chave usada no formulário pra "vale pra qualquer produto". */
const GERAL = "geral";

type TemplateRow = {
  id: string;
  title: string;
  content: string;
  active: boolean;
  producerId: string | null;
};

function MensagemForm({ template }: { template: TemplateRow }) {
  return (
    <Card className="bg-app">
      {/* key com o estado do servidor: os campos são não controlados, e sem
          remontar eles continuariam mostrando o valor antigo depois de salvar. */}
      <form
        key={`${template.title}|${template.content}|${template.active}`}
        action={updateTemplate}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={template.id} />
        <div className="flex items-center justify-between gap-4">
          <input
            name="title"
            defaultValue={template.title}
            required
            className="flex-1 bg-transparent text-sm font-bold text-primary focus:outline-none"
          />
          <label className="flex shrink-0 items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              name="active"
              defaultChecked={template.active}
              className="h-3.5 w-3.5 accent-success"
            />
            Ativa
          </label>
        </div>
        <textarea
          name="content"
          defaultValue={template.content}
          required
          rows={3}
          className={textareaClass}
        />
        <div className="flex items-center justify-end gap-2">
          <SubmitButton variant="secondary" className="py-1 text-xs">
            Salvar
          </SubmitButton>
          <Button
            type="submit"
            form={`excluir-${template.id}`}
            variant="danger"
            className="py-1 text-xs"
          >
            Excluir
          </Button>
        </div>
      </form>

      {/* Form irmão, nunca dentro do de salvar: form dentro de form é HTML
          inválido e o botão de dentro acaba submetendo o de fora. */}
      <ConfirmForm
        id={`excluir-${template.id}`}
        action={deleteTemplate}
        confirmMessage={`Excluir a mensagem "${template.title}"?`}
      >
        <input type="hidden" name="id" value={template.id} />
      </ConfirmForm>
    </Card>
  );
}

function NovaMensagem({ producerId, label }: { producerId: string; label: string }) {
  return (
    <form action={createTemplate} className="space-y-2.5 rounded-lg border border-dashed border-border p-3">
      <input type="hidden" name="producerId" value={producerId} />
      <p className="text-[11px] text-muted">Nova mensagem para {label}</p>
      <Input name="title" placeholder="Título (ex: Primeiro contato)" required className="h-8 py-1 text-sm" />
      <textarea
        name="content"
        required
        rows={3}
        placeholder="Olá {{nome}}, tudo bem? Vi que você se interessou por {{produto}}..."
        className={textareaClass}
      />
      <div className="flex justify-end">
        <SubmitButton variant="secondary" className="py-1 text-xs" savedMessage="Mensagem salva">
          Adicionar
        </SubmitButton>
      </div>
    </form>
  );
}

export default async function MeusProdutosPage() {
  const session = await auth();
  const operatorId = session!.user.id;

  const [acessos, templates] = await Promise.all([
    // Os produtos que ele está liberado a atender, com o produtor de cada um.
    prisma.productAccess.findMany({
      where: { operatorId, OR: [{ allowApproved: true }, { allowPending: true }] },
      include: {
        product: {
          select: { name: true, producer: { select: { id: true, name: true, active: true } } },
        },
      },
    }),
    prisma.messageTemplate.findMany({
      where: { operatorId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Um produtor pode ter mais de um produto liberado; aqui ele aparece uma vez
  // só, porque a mensagem vale pro produtor inteiro (é o que o lead carrega).
  const produtores = new Map<string, { id: string; name: string; produtos: string[] }>();
  for (const a of acessos) {
    const p = a.product.producer;
    if (!p.active) continue;
    const entrada = produtores.get(p.id) ?? { id: p.id, name: p.name, produtos: [] };
    if (!entrada.produtos.includes(a.product.name)) entrada.produtos.push(a.product.name);
    produtores.set(p.id, entrada);
  }
  const lista = [...produtores.values()].sort((a, b) => a.name.localeCompare(b.name));

  const porProdutor = (id: string | null) => templates.filter((t) => t.producerId === id);
  const gerais = porProdutor(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Meus produtos</h1>
        <p className="text-sm text-secondary">
          Os produtos que você atende, cada um com as suas mensagens. Ao atender
          um lead, só aparecem as mensagens daquele produto — assim não tem como
          mandar a copy de um produto no cliente de outro. Use{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-accent">
            {"{{nome}}"}
          </code>
          ,{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-accent">
            {"{{produto}}"}
          </code>{" "}
          e{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-accent">
            {"{{doc}}"}
          </code>{" "}
          como variáveis — o CPF sai formatado, tipo 028.471.346-54.
        </p>
      </div>

      {lista.length === 0 && (
        <Card className="max-w-2xl">
          <p className="text-sm text-secondary">
            Você ainda não está liberado em nenhum produto. Fale com o
            administrador — é ele quem libera, e sem isso você não recebe leads.
          </p>
        </Card>
      )}

      {lista.map((p) => {
        const doProdutor = porProdutor(p.id);
        return (
          <Card key={p.id} className="max-w-2xl">
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-title">{p.name}</h2>
              <span className="text-[11px] text-muted">
                {doProdutor.length === 0
                  ? "nenhuma mensagem ainda"
                  : `${doProdutor.length} mensagem(ns)`}
              </span>
            </div>
            <p className="mb-4 text-[11px] text-muted">{p.produtos.join(" · ")}</p>

            <div className="space-y-3">
              {doProdutor.map((t) => (
                <MensagemForm key={t.id} template={t} />
              ))}
              <NovaMensagem producerId={p.id} label={p.name} />
            </div>
          </Card>
        );
      })}

      <Card className="max-w-2xl">
        <h2 className="mb-1 text-sm font-semibold text-title">Vale para todos os produtos</h2>
        <p className="mb-4 text-[11px] text-muted">
          Mensagens sem produto: aparecem em qualquer lead, junto com as do
          produto dele. Suas mensagens antigas ficaram aqui — mova o que for de
          um produto só criando a mensagem dentro dele.
        </p>
        <div className="space-y-3">
          {gerais.map((t) => (
            <MensagemForm key={t.id} template={t} />
          ))}
          <NovaMensagem producerId={GERAL} label="qualquer produto" />
        </div>
      </Card>
    </div>
  );
}
