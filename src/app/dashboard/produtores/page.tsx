import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { createProducer, addProduct, removeProduct, regenerateToken } from "./actions";

export const dynamic = "force-dynamic";

const GATEWAYS = [
  { key: "kiwify", label: "Kiwify" },
  { key: "perfectpay", label: "PerfectPay" },
  { key: "disrupty", label: "Disrupty" },
  { key: "smpay", label: "SMPay" },
];

export default async function ProdutoresPage() {
  const baseUrl = await getBaseUrl();
  const producers = await prisma.producer.findMany({
    include: {
      products: { orderBy: { createdAt: "asc" } },
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold">Produtores</h1>
        <p className="text-xs text-neutral-500">
          Cada produtor tem seu próprio link de webhook. Cole a URL do gateway
          certo (Kiwify, PerfectPay, Disrupty ou SMPay) na plataforma dele para
          os leads começarem a chegar já identificados.
        </p>
      </div>

      <Card className="max-w-md">
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">
          Novo produtor
        </h2>
        <form action={createProducer} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Nome do produtor
            </label>
            <Input name="name" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Produto (opcional, pode adicionar mais depois)
            </label>
            <Input name="productName" placeholder="Ex: Curso de Marketing Digital" />
          </div>
          <Button type="submit" className="w-full">
            Criar produtor
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {producers.map((producer) => (
          <Card key={producer.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{producer.name}</h3>
                <p className="text-xs text-neutral-500">
                  {producer._count.leads} leads recebidos
                </p>
              </div>
              <form action={regenerateToken}>
                <input type="hidden" name="producerId" value={producer.id} />
                <Button type="submit" variant="ghost">
                  Gerar novo token
                </Button>
              </form>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-neutral-400">
                Produtos
              </p>
              <div className="flex flex-wrap gap-2">
                {producer.products.map((product) => (
                  <div
                    key={product.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-200"
                  >
                    {product.name}
                    <form action={removeProduct} className="contents">
                      <input type="hidden" name="id" value={product.id} />
                      <button
                        type="submit"
                        className="text-neutral-500 hover:text-red-400"
                        aria-label="Remover produto"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                ))}
                {producer.products.length === 0 && (
                  <span className="text-xs text-neutral-600">
                    Nenhum produto cadastrado
                  </span>
                )}
              </div>
              <form action={addProduct} className="mt-2 flex gap-2">
                <input type="hidden" name="producerId" value={producer.id} />
                <Input
                  name="name"
                  placeholder="Adicionar produto"
                  className="max-w-xs"
                />
                <Button type="submit" variant="secondary">
                  Adicionar
                </Button>
              </form>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-neutral-400">
                Links de webhook
              </p>
              <div className="space-y-2">
                {GATEWAYS.map((gw) => {
                  const url = `${baseUrl}/api/webhooks/${gw.key}?token=${producer.webhookToken}`;
                  return (
                    <div key={gw.key} className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs text-neutral-500">
                        {gw.label}
                      </span>
                      <code className="flex-1 truncate rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-xs text-neutral-400">
                        {url}
                      </code>
                      <CopyButton value={url} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}

        {producers.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nenhum produtor cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
