import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTemplate, updateTemplate, deleteTemplate } from "./actions";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.messageTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold">Mensagens de atendimento</h1>
        <p className="text-xs text-neutral-500">
          Use <code className="text-neutral-300">{"{{nome}}"}</code> e{" "}
          <code className="text-neutral-300">{"{{produto}}"}</code> como
          variáveis — elas são substituídas automaticamente pelos dados do
          lead na hora de enviar.
        </p>
      </div>

      <Card className="max-w-xl">
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">
          Nova mensagem
        </h2>
        <form action={createTemplate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Título</label>
            <Input name="title" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Mensagem</label>
            <textarea
              name="content"
              required
              rows={4}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <Button type="submit">Criar mensagem</Button>
        </form>
      </Card>

      <div className="space-y-4">
        {templates.map((template) => (
          <Card key={template.id} className="max-w-xl">
            <form action={updateTemplate} className="space-y-3">
              <input type="hidden" name="id" value={template.id} />
              <div>
                <label className="mb-1 block text-xs text-neutral-400">
                  Título
                </label>
                <Input name="title" defaultValue={template.title} required />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-400">
                  Mensagem
                </label>
                <textarea
                  name="content"
                  defaultValue={template.content}
                  required
                  rows={4}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={template.active}
                  className="h-4 w-4"
                />
                Ativa (disponível para os operadores)
              </label>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                  Salvar
                </Button>
              </div>
            </form>
            <form action={deleteTemplate} className="mt-2">
              <input type="hidden" name="id" value={template.id} />
              <Button type="submit" variant="danger">
                Excluir
              </Button>
            </form>
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nenhuma mensagem cadastrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
