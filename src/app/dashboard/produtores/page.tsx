import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import {
  createProducer,
  addProduct,
  removeProduct,
  regenerateToken,
  updateSmpaySecret,
} from "./actions";

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
        <h1 className="text-2xl font-bold tracking-tight text-primary">Produtores</h1>
        <p className="text-sm text-secondary">
          Gerencie produtores, produtos e integrações de webhook.
        </p>
      </div>

      <Card className="max-w-2xl">
        <h2 className="mb-4 text-sm font-semibold text-primary">
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
          <Card key={producer.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-primary">{producer.name}</h3>
                <p className="mt-0.5 text-xs text-secondary">
                  <span className="font-mono font-semibold text-secondary">
                    {producer._count.leads}
                  </span>{" "}
                  leads recebidos
                </p>
              </div>
              <form action={regenerateToken}>
                <input type="hidden" name="producerId" value={producer.id} />
                <Button type="submit" variant="secondary">
                  Gerar novo token
                </Button>
              </form>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-app p-4">
                <p className="mb-3 text-xs font-semibold text-secondary">
                  Produtos
                </p>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {producer.products.map((product) => (
                    <div
                      key={product.id}
                      className="inline-flex items-center gap-2 rounded-full bg-accent/15 py-1 pl-3 pr-1.5 text-xs text-accent"
                    >
                      {product.name}
                      <form action={removeProduct} className="contents">
                        <input type="hidden" name="id" value={product.id} />
                        <button
                          type="submit"
                          className="text-accent/70 hover:text-danger"
                          aria-label="Remover produto"
                        >
                          ×
                        </button>
                      </form>
                    </div>
                  ))}
                  {producer.products.length === 0 && (
                    <span className="text-xs text-muted">
                      Nenhum produto cadastrado
                    </span>
                  )}
                </div>
                <form action={addProduct} className="flex gap-2">
                  <input type="hidden" name="producerId" value={producer.id} />
                  <Input
                    name="name"
                    placeholder="Adicionar produto"
                  />
                  <Button type="submit" variant="secondary">
                    Adicionar
                  </Button>
                </form>
              </div>

              <div className="rounded-lg border border-border bg-app p-4">
                <p className="mb-3 text-xs font-semibold text-secondary">
                  Links de webhook
                </p>
                <div className="space-y-2.5">
                  {GATEWAYS.map((gw) => {
                    const url = `${baseUrl}/api/webhooks/${gw.key}?token=${producer.webhookToken}`;
                    return (
                      <div key={gw.key}>
                        <span className="mb-1 block text-[11px] text-muted">
                          {gw.label}
                        </span>
                        <div className="flex gap-1.5">
                          <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-[11px] text-secondary">
                            {url}
                          </code>
                          <CopyButton value={url} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form
                  action={updateSmpaySecret}
                  className="mt-4 flex gap-1.5 border-t border-border pt-3.5"
                >
                  <input type="hidden" name="producerId" value={producer.id} />
                  <div className="min-w-0 flex-1">
                    <span className="mb-1 block text-[11px] text-muted">
                      Secret do webhook SMPay (um por produtor)
                    </span>
                    <Input
                      name="smpayWebhookSecret"
                      defaultValue={producer.smpayWebhookSecret ?? ""}
                      placeholder="Cole o secret gerado no painel da SMPay"
                      className="font-mono text-[11px]"
                    />
                  </div>
                  <Button type="submit" variant="secondary" className="self-end">
                    Salvar
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}

        {producers.length === 0 && (
          <p className="text-sm text-secondary">
            Nenhum produtor cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
