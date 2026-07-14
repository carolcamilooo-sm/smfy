import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProducerCard } from "@/components/producer-card";
import {
  createProducer,
  addProduct,
  updateProduct,
  removeProduct,
  toggleProductActive,
  updateProductAccess,
  regenerateToken,
  updateGatewaySecret,
  removeProducer,
  reactivateProducer,
  setLastWebhookGateway,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ProdutoresPage() {
  const baseUrl = await getBaseUrl();
  const [allProducers, operators] = await Promise.all([
    prisma.producer.findMany({
      include: {
        products: {
          orderBy: { createdAt: "asc" },
          include: { accesses: true },
        },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "OPERATOR" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const producers = allProducers.filter((p) => p.active);
  const archivedProducers = allProducers.filter((p) => !p.active);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Produtores</h1>
        <p className="text-sm text-secondary">
          Gerencie produtores, produtos e integrações de webhook.
        </p>
      </div>

      <Card className="max-w-2xl">
        <h2 className="mb-4 text-sm font-semibold text-title">
          Novo produtor
        </h2>
        <form action={createProducer} className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1.4fr_auto] sm:items-end">
          <div>
            <label className="mb-1.5 block text-xs text-secondary">
              Nome do produtor
            </label>
            <Input name="name" placeholder="Ex: Estúdio Fit" required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-secondary">
              Produto (opcional)
            </label>
            <Input name="productName" placeholder="Ex: Curso PRO" />
          </div>
          <Button type="submit">Adicionar produtor</Button>
        </form>
      </Card>

      <div className="space-y-4">
        {producers.map((producer) => (
          <ProducerCard
            key={producer.id}
            producer={producer}
            operators={operators}
            baseUrl={baseUrl}
            addProduct={addProduct}
            updateProduct={updateProduct}
            removeProduct={removeProduct}
            toggleProductActive={toggleProductActive}
            updateProductAccess={updateProductAccess}
            regenerateToken={regenerateToken}
            updateGatewaySecret={updateGatewaySecret}
            removeProducer={removeProducer}
            setLastWebhookGateway={setLastWebhookGateway}
          />
        ))}

        {producers.length === 0 && (
          <p className="text-sm text-secondary">
            Nenhum produtor cadastrado ainda.
          </p>
        )}
      </div>

      {archivedProducers.length > 0 && (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-title">
            Produtores arquivados
          </h2>
          <div className="space-y-2">
            {archivedProducers.map((producer) => (
              <div
                key={producer.id}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-secondary">{producer.name}</span>
                  <Badge tone="gray">Arquivado</Badge>
                  <span className="text-xs text-muted">
                    {producer._count.leads} lead(s) no histórico
                  </span>
                </div>
                <form action={reactivateProducer}>
                  <input type="hidden" name="producerId" value={producer.id} />
                  <Button type="submit" variant="secondary">
                    Reativar
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
