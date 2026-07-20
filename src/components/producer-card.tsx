"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/copy-button";
import { ConfirmForm } from "@/components/confirm-form";
import { cn } from "@/lib/utils";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

const GATEWAYS = [
  { key: "kiwify", label: "Kiwify", secretField: "kiwifyWebhookSecret", secretLabel: "Secret do webhook Kiwify" },
  {
    key: "perfectpay",
    label: "PerfectPay",
    secretField: "perfectpayToken",
    secretLabel: "Public token da PerfectPay",
  },
  { key: "disrupty", label: "Disrupty", secretField: null, secretLabel: null },
  { key: "smpay", label: "SMPay", secretField: "smpayWebhookSecret", secretLabel: "Secret do webhook SMPay" },
  { key: "payt", label: "PayT", secretField: "paytIntegrationKey", secretLabel: "Integration key da PayT" },
] as const;

type ProductAccess = {
  operatorId: string;
  allowApproved: boolean;
  allowPending: boolean;
};

type Product = {
  id: string;
  name: string;
  sigla: string | null;
  codigo: string | null;
  active: boolean;
  createdAt: Date | string;
  accesses: ProductAccess[];
};

type Operator = {
  id: string;
  name: string;
};

type Producer = {
  id: string;
  name: string;
  webhookToken: string;
  smpayWebhookSecret: string | null;
  kiwifyWebhookSecret: string | null;
  perfectpayToken: string | null;
  paytIntegrationKey: string | null;
  lastWebhookGateway: string | null;
  products: Product[];
  _count: { leads: number };
};

function initialGateway(producer: Producer): (typeof GATEWAYS)[number]["key"] {
  if (producer.lastWebhookGateway && GATEWAYS.some((g) => g.key === producer.lastWebhookGateway)) {
    return producer.lastWebhookGateway as (typeof GATEWAYS)[number]["key"];
  }
  const configured = GATEWAYS.find((g) => g.secretField && producer[g.secretField]);
  return configured?.key ?? "kiwify";
}

export function ProducerCard({
  producer,
  operators,
  baseUrl,
  addProduct,
  updateProduct,
  removeProduct,
  toggleProductActive,
  updateProductAccess,
  regenerateToken,
  updateProducer,
  updateGatewaySecret,
  removeProducer,
  setLastWebhookGateway,
}: {
  producer: Producer;
  operators: Operator[];
  baseUrl: string;
  addProduct: (formData: FormData) => void;
  updateProduct: (formData: FormData) => void;
  removeProduct: (formData: FormData) => void;
  toggleProductActive: (formData: FormData) => void;
  updateProductAccess: (formData: FormData) => void;
  regenerateToken: (formData: FormData) => void;
  updateProducer: (formData: FormData) => void;
  updateGatewaySecret: (formData: FormData) => void;
  removeProducer: (formData: FormData) => void;
  setLastWebhookGateway: (formData: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeGateway, setActiveGateway] = useState<(typeof GATEWAYS)[number]["key"]>(() =>
    initialGateway(producer)
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProducerName, setEditingProducerName] = useState(false);

  function selectGateway(key: (typeof GATEWAYS)[number]["key"]) {
    setActiveGateway(key);
    const formData = new FormData();
    formData.set("producerId", producer.id);
    formData.set("gateway", key);
    setLastWebhookGateway(formData);
  }
  const [accessProductId, setAccessProductId] = useState<string | null>(null);

  const gateway = GATEWAYS.find((g) => g.key === activeGateway)!;
  const url = `${baseUrl}/api/webhooks/${gateway.key}?token=${producer.webhookToken}`;

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 shrink-0"
          >
            {expanded ? (
              <ChevronDown size={18} className="text-muted" />
            ) : (
              <ChevronRight size={18} className="text-muted" />
            )}
          </button>
          <div className="min-w-0">
            {editingProducerName ? (
              <form
                action={updateProducer}
                className="flex items-center gap-1.5"
                onSubmit={() => setEditingProducerName(false)}
              >
                <input type="hidden" name="id" value={producer.id} />
                <Input
                  name="name"
                  defaultValue={producer.name}
                  autoFocus
                  className="h-8 py-1 text-base font-bold"
                />
                <SubmitButton variant="secondary" className="shrink-0 py-1 text-xs">
                  Salvar
                </SubmitButton>
                <button
                  type="button"
                  onClick={() => setEditingProducerName(false)}
                  className="shrink-0 text-xs text-secondary hover:text-primary"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditingProducerName(true)}
                className="text-left hover:text-accent"
                title="Editar nome do produtor"
              >
                <h3 className="text-base font-bold text-primary">{producer.name}</h3>
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 block text-left"
            >
              <p className="text-xs text-secondary">
                <span className="font-mono font-semibold text-secondary">{producer._count.leads}</span>{" "}
                leads recebidos · {producer.products.length} produto(s)
              </p>
            </button>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <ConfirmForm
            action={removeProducer}
            confirmMessage={
              producer._count.leads === 0
                ? `Remover "${producer.name}" permanentemente? Essa ação não pode ser desfeita.`
                : `"${producer.name}" tem ${producer._count.leads} lead(s) no histórico, então vai ser arquivado (não excluído) e sair da lista de produtores ativos. O webhook dele para de gerar leads novos. Continuar?`
            }
          >
            <input type="hidden" name="producerId" value={producer.id} />
            <Button type="submit" variant="danger">
              Remover
            </Button>
          </ConfirmForm>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-border bg-app p-4">
            <p className="mb-3 text-xs font-semibold text-secondary">Produtos</p>

            {producer.products.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-secondary">
                      <th className="pb-2 pr-3">Nome</th>
                      <th className="pb-2 pr-3">Sigla</th>
                      <th className="pb-2 pr-3">Código</th>
                      <th className="pb-2 pr-3">Situação</th>
                      <th className="pb-2 pr-3">Criado em</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {producer.products.map((product) => (
                      <Fragment key={product.id}>
                        <tr className="border-t border-border">
                          <td className="py-2 pr-3 text-primary">
                            {editingProductId === product.id ? (
                              <form
                                action={updateProduct}
                                className="flex items-center gap-1.5"
                                onSubmit={() => setEditingProductId(null)}
                              >
                                <input type="hidden" name="id" value={product.id} />
                                <Input
                                  name="name"
                                  defaultValue={product.name}
                                  autoFocus
                                  className="h-7 py-1 text-sm"
                                />
                                <SubmitButton variant="secondary" className="shrink-0 py-1 text-xs">
                                  Salvar
                                </SubmitButton>
                                <button
                                  type="button"
                                  onClick={() => setEditingProductId(null)}
                                  className="shrink-0 text-xs text-secondary hover:text-primary"
                                >
                                  Cancelar
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingProductId(product.id)}
                                className="text-left hover:text-accent"
                                title="Editar nome do produto"
                              >
                                {product.name}
                              </button>
                            )}
                          </td>
                          <td className="py-2 pr-3 font-mono text-secondary">{product.sigla ?? "-"}</td>
                          <td className="py-2 pr-3 font-mono text-secondary">{product.codigo ?? "-"}</td>
                          <td className="py-2 pr-3">
                            <Badge tone={product.active ? "green" : "gray"}>
                              {product.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs text-muted">{formatDate(product.createdAt)}</td>
                          <td className="py-2">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setAccessProductId((v) => (v === product.id ? null : product.id))
                                }
                                className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-secondary hover:text-primary"
                              >
                                {accessProductId === product.id ? "Fechar" : "Acesso"}
                              </button>
                              <form action={toggleProductActive}>
                                <input type="hidden" name="id" value={product.id} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-secondary hover:text-primary"
                                >
                                  {product.active ? "Desativar" : "Ativar"}
                                </button>
                              </form>
                              <form action={removeProduct}>
                                <input type="hidden" name="id" value={product.id} />
                                <button
                                  type="submit"
                                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-secondary hover:text-danger"
                                >
                                  Remover
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                        {accessProductId === product.id && (
                          <tr className="border-t border-border bg-surface/60">
                            <td colSpan={6} className="p-3">
                              <p className="mb-2 text-xs font-semibold text-secondary">
                                Liberar leads desse produto por atendente
                              </p>
                              {operators.length === 0 ? (
                                <p className="text-xs text-muted">Nenhum atendente cadastrado ainda.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {operators.map((op) => {
                                    const access = product.accesses.find((a) => a.operatorId === op.id);
                                    return (
                                      <form
                                        key={op.id}
                                        action={updateProductAccess}
                                        className="flex items-center gap-4 rounded-md border border-border bg-app px-3 py-2"
                                      >
                                        <input type="hidden" name="productId" value={product.id} />
                                        <input type="hidden" name="operatorId" value={op.id} />
                                        <span className="w-40 shrink-0 truncate text-xs text-primary">
                                          {op.name}
                                        </span>
                                        <label className="flex items-center gap-1.5 text-xs text-secondary">
                                          <input
                                            type="checkbox"
                                            name="allowApproved"
                                            defaultChecked={access?.allowApproved ?? false}
                                            className="h-3.5 w-3.5"
                                          />
                                          Aprovados
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-secondary">
                                          <input
                                            type="checkbox"
                                            name="allowPending"
                                            defaultChecked={access?.allowPending ?? false}
                                            className="h-3.5 w-3.5"
                                          />
                                          Pendentes
                                        </label>
                                        <SubmitButton variant="secondary" className="ml-auto py-1 text-xs">
                                          Salvar
                                        </SubmitButton>
                                      </form>
                                    );
                                  })}
                                </div>
                              )}
                              <p className="mt-2 text-[11px] text-muted">
                                Sem nenhum atendente liberado, o produto usa a distribuição geral (%
                                por atendente) normalmente.
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {producer.products.length === 0 && (
              <p className="mb-4 text-xs text-muted">Nenhum produto cadastrado</p>
            )}

            <form action={addProduct} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
              <input type="hidden" name="producerId" value={producer.id} />
              <Input name="name" placeholder="Nome do produto" required />
              <Input name="sigla" placeholder="Sigla" />
              <Input name="codigo" placeholder="Código" />
              <Button type="submit" variant="secondary">
                Cadastrar produto
              </Button>
            </form>
          </div>

          <div className="rounded-lg border border-border bg-app p-4">
            <p className="mb-3 text-xs font-semibold text-secondary">Webhook por gateway</p>

            <div className="mb-3 flex flex-wrap gap-1.5 border-b border-border pb-3">
              {GATEWAYS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => selectGateway(g.key)}
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
              {/* Fica aqui, e não no cabeçalho: trocar o token é assunto desta
                  URL. Discreto e com confirmação porque um clique sem querer
                  derruba a entrada de leads até alguém atualizar o gateway —
                  foi assim que o Cash No Pix ficou 6h sem receber. */}
              <ConfirmForm
                action={regenerateToken}
                confirmMessage={`Gerar um token novo para "${producer.name}"?\n\nA URL atual para de funcionar na hora, e os leads do ${gateway.label} PARAM DE CHEGAR até você colar a URL nova lá no painel deles.\n\nSó faça isso se o token vazou.`}
              >
                <input type="hidden" name="producerId" value={producer.id} />
                {/* Mesmas classes e mesmo ícone do Copiar: assim os dois têm a
                    altura idêntica sem chumbar pixel. A cor é que separa —
                    apagado, e vermelho só no hover. */}
                <button
                  type="submit"
                  title="Gera um token novo e invalida a URL atual"
                  className="inline-flex h-full shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted hover:border-danger/50 hover:text-danger"
                >
                  <RotateCw size={14} /> Novo token
                </button>
              </ConfirmForm>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">
              Trocou o token? Copie a URL de novo e atualize no painel do{" "}
              {gateway.label} — senão os leads param de chegar.
            </p>

            {gateway.secretField && (
              <form
                key={gateway.secretField}
                action={updateGatewaySecret}
                className="mt-4 flex gap-1.5 border-t border-border pt-3.5"
              >
                <input type="hidden" name="producerId" value={producer.id} />
                <input type="hidden" name="field" value={gateway.secretField} />
                <div className="min-w-0 flex-1">
                  <span className="mb-1 block text-[11px] text-muted">
                    {gateway.secretLabel} (um por produtor)
                  </span>
                  <Input
                    name="secret"
                    defaultValue={producer[gateway.secretField] ?? ""}
                    placeholder="Cole o secret/token gerado no painel do gateway"
                    className="font-mono text-[11px]"
                  />
                </div>
                <SubmitButton variant="secondary" className="self-end">
                  Salvar
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
