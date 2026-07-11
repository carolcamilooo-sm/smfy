import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";

export const dynamic = "force-dynamic";

const textareaClass =
  "w-full rounded-lg border border-border bg-app px-3.5 py-3 text-sm text-primary focus:border-accent focus:outline-none";

export default async function TemplatesPage() {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Mensagens</h1>
        <p className="text-sm text-secondary">
          Modelos de mensagem usados pelos operadores ao chamar o lead no
          WhatsApp — use{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-accent">
            {"{{nome}}"}
          </code>{" "}
          e{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono text-accent">
            {"{{produto}}"}
          </code>{" "}
          como variáveis.
        </p>
      </div>

      <Card className="max-w-2xl">
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Nova mensagem
        </h2>
        <form action={createTemplate} className="space-y-3.5">
          <div>
            <label className="mb-1.5 block text-xs text-secondary">Título</label>
            <Input name="title" placeholder="Ex: Primeiro contato" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-secondary">Mensagem</label>
            <textarea
              name="content"
              required
              rows={4}
              placeholder="Olá {{nome}}, tudo bem? Vi que você se interessou por {{produto}}..."
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Salvar mensagem</Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3.5 text-sm font-semibold text-primary">Mensagens existentes</h2>
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className="max-w-2xl">
              <form action={updateTemplate} className="space-y-3">
                <input type="hidden" name="id" value={template.id} />
                <div className="flex items-center justify-between gap-4">
                  <input
                    name="title"
                    defaultValue={template.title}
                    required
                    className="flex-1 bg-transparent text-[15px] font-bold text-primary focus:outline-none"
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-secondary">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={template.active}
                        className="h-3.5 w-3.5 accent-success"
                      />
                      Ativa
                    </label>
                  </div>
                </div>
                <textarea
                  name="content"
                  defaultValue={template.content}
                  required
                  rows={3}
                  className={textareaClass}
                />
                <div className="flex justify-end gap-2">
                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                </div>
              </form>
              <form action={deleteTemplate} className="mt-2 flex justify-end">
                <input type="hidden" name="id" value={template.id} />
                <Button type="submit" variant="danger">
                  Excluir
                </Button>
              </form>
            </Card>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-secondary">
              Nenhuma mensagem cadastrada ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
