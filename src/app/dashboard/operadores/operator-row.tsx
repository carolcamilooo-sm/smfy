"use client";

import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { ConfirmForm } from "@/components/confirm-form";
import { fmtShare } from "@/lib/utils";

type ProductAccessInfo = {
  allowApproved: boolean;
  allowPending: boolean;
  dailyLimitApproved: number | null;
  dailyLimitPending: number | null;
};

type ProductGroup = {
  producerName: string;
  products: { id: string; name: string; active: boolean }[];
};

/**
 * Fatia da conta nos leads aprovados. `null` = sem % fixa, entra no rodízio e
 * recebe conforme trabalha a fila. Número = fatia garantida pela % do grupo.
 * Pendentes e recusados não têm fatia: são sempre rodízio.
 */
export type OperatorShare = {
  approved: number | null;
  groupName: string | null;
};

function operatorStatusBadge(status: string) {
  if (status === "ONLINE") return <Badge tone="green">Online</Badge>;
  if (status === "IDLE") return <Badge tone="yellow">Ocioso</Badge>;
  return <Badge tone="gray">Offline</Badge>;
}

export function OperatorRow({
  operator,
  effectiveStatus,
  share,
  productGroups,
  accessByProductId,
  updateDistribution,
  updateProductAccess,
  removeOperator,
}: {
  operator: {
    id: string;
    name: string;
    email: string;
    active: boolean;
    priority: boolean;
    distributionRule: { active: boolean } | null;
  };
  effectiveStatus: string;
  share: OperatorShare | null;
  productGroups: ProductGroup[];
  accessByProductId: Map<string, ProductAccessInfo>;
  updateDistribution: (formData: FormData) => void;
  updateProductAccess: (formData: FormData) => void;
  removeOperator: (formData: FormData) => void;
}) {
  const [productsOpen, setProductsOpen] = useState(false);
  const grantedCount = Array.from(accessByProductId.values()).filter(
    (a) => a.allowApproved || a.allowPending
  ).length;

  // Só os produtos que este atendente recebe. Listar o catálogo inteiro fazia
  // a tela dizer "produtos liberados" mostrando sobretudo os que ele não tem.
  // Pra liberar um produto novo, a marcação é feita na aba Produtores.
  const grantedGroups = productGroups
    .map((g) => ({
      ...g,
      products: g.products.filter((p) => {
        const a = accessByProductId.get(p.id);
        return Boolean(a?.allowApproved || a?.allowPending);
      }),
    }))
    .filter((g) => g.products.length > 0);

  return (
    <Fragment>
      <form action={updateDistribution} className="contents">
        <input type="hidden" name="operatorId" value={operator.id} />
        <div className="border-t border-border py-2 text-primary">{operator.name}</div>
        <div className="border-t border-border py-2 text-secondary">{operator.email}</div>
        <div className="border-t border-border py-2">{operatorStatusBadge(effectiveStatus)}</div>
        <div className="border-t border-border py-2">
          {!share ? (
            <span className="font-mono text-xs text-muted">—</span>
          ) : share.approved == null ? (
            // Fora de grupo não existe venda aprovada; o que sobra pra pessoa é
            // o rodízio de pendentes e recusados.
            <span
              className="text-xs text-secondary"
              title="Não recebe venda aprovada (só grupo recebe). Pendentes e recusados chegam pelo rodízio."
            >
              <span className="text-muted">sem venda</span> · rodízio
            </span>
          ) : (
            // Conta de grupo vive nos dois mundos: fatia das vendas e rodízio
            // no resto. Mostrar só a % faria parecer que não recebe pendente.
            <div title={`${fmtShare(share.approved)} das vendas aprovadas pelo grupo; pendentes e recusados pelo rodízio, junto com a equipe`}>
              <span className="text-xs">
                <span className="font-mono font-semibold text-primary">
                  {fmtShare(share.approved)}
                </span>
                <span className="text-muted"> venda · </span>
                <span className="text-secondary">rodízio</span>
              </span>
              {share.groupName && (
                <span className="block truncate text-[11px] text-muted">{share.groupName}</span>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-border py-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={operator.distributionRule?.active ?? true}
            className="h-4 w-4"
          />
        </div>
        <div className="border-t border-border py-2">
          <input
            type="checkbox"
            name="priority"
            defaultChecked={operator.priority}
            className="h-4 w-4"
          />
        </div>
        <div className="border-t border-border py-2">
          <input
            type="checkbox"
            name="userActive"
            defaultChecked={operator.active}
            className="h-4 w-4"
          />
        </div>
        <div className="border-t border-border py-2">
          <SubmitButton variant="secondary">Salvar</SubmitButton>
        </div>
      </form>
      <div className="border-t border-border py-2">
        <button
          type="button"
          onClick={() => setProductsOpen((v) => !v)}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-secondary hover:text-primary"
        >
          {productsOpen ? "Fechar" : "Produtos"}
          {grantedCount > 0 ? ` (${grantedCount})` : ""}
        </button>
      </div>
      <ConfirmForm
        action={removeOperator}
        confirmMessage={`Remover "${operator.name}" da equipe? Se ele já atendeu algum lead, a conta só fica desativada (histórico preservado); senão é excluída de vez.`}
        className="contents"
      >
        <input type="hidden" name="operatorId" value={operator.id} />
        <div className="border-t border-border py-2">
          <Button type="submit" variant="danger">
            Remover
          </Button>
        </div>
      </ConfirmForm>

      {productsOpen && (
        <div className="col-span-10 rounded-lg border border-border bg-app p-3">
          <p className="mb-2 text-xs font-semibold text-secondary">
            Produtos liberados para {operator.name}
          </p>
          {grantedGroups.length === 0 ? (
            <p className="text-xs text-muted">
              Nenhum produto liberado — este atendente não recebe lead nenhum de
              aprovados ou pendentes. Libere na aba Produtores, marcando o nome
              dele no produto.
            </p>
          ) : (
            <div className="space-y-3">
              {grantedGroups.map((group) => (
                <div key={group.producerName}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {group.producerName}
                  </p>
                  <div className="space-y-1.5">
                    {group.products.map((product) => {
                      const access = accessByProductId.get(product.id);
                      return (
                        <form
                          key={product.id}
                          action={updateProductAccess}
                          className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
                        >
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="operatorId" value={operator.id} />
                          <span className="w-40 shrink-0 truncate text-xs text-primary">
                            {product.name}
                            {!product.active && (
                              <span className="ml-1 text-[10px] text-muted">(inativo)</span>
                            )}
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
                            limite/dia
                            <Input
                              type="number"
                              name="dailyLimitApproved"
                              min={0}
                              defaultValue={access?.dailyLimitApproved ?? ""}
                              placeholder="-"
                              className="w-16 py-1 font-mono text-xs"
                            />
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
                          <label className="flex items-center gap-1.5 text-xs text-secondary">
                            limite/dia
                            <Input
                              type="number"
                              name="dailyLimitPending"
                              min={0}
                              defaultValue={access?.dailyLimitPending ?? ""}
                              placeholder="-"
                              className="w-16 py-1 font-mono text-xs"
                            />
                          </label>
                          <SubmitButton variant="secondary" className="ml-auto py-1 text-xs">
                            Salvar
                          </SubmitButton>
                        </form>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Aqui aparecem só os produtos que ele já recebe; para liberar um produto novo,
            marque o nome dele na aba Produtores. A marcação vale pra todos os leads do
            produtor, não só pra essa oferta — os gateways mandam o nome da oferta, que
            muda o tempo todo, então quem manda é o produtor. Limite/dia vazio = sem
            limite; ao bater o limite, o lead vai para outro atendente liberado, só
            ficando em espera se ninguém mais estiver disponível.
          </p>
        </div>
      )}
    </Fragment>
  );
}
