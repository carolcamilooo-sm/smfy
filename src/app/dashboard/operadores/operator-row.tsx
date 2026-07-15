"use client";

import { Fragment, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmForm } from "@/components/confirm-form";

type ProductAccessInfo = {
  allowApproved: boolean;
  allowPending: boolean;
  dailyLimitApproved: number | null;
  dailyLimitPending: number | null;
};

type ProductGroup = {
  producerName: string;
  products: { id: string; name: string }[];
};

function operatorStatusBadge(status: string) {
  if (status === "ONLINE") return <Badge tone="green">Online</Badge>;
  if (status === "IDLE") return <Badge tone="yellow">Ocioso</Badge>;
  return <Badge tone="gray">Offline</Badge>;
}

export function OperatorRow({
  operator,
  effectiveStatus,
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
    distributionRule: {
      weightApproved: number;
      weightPending: number;
      weightDeclined: number;
      active: boolean;
    } | null;
  };
  effectiveStatus: string;
  productGroups: ProductGroup[];
  accessByProductId: Map<string, ProductAccessInfo>;
  updateDistribution: (formData: FormData) => void;
  updateProductAccess: (formData: FormData) => void;
  removeOperator: (formData: FormData) => void;
}) {
  const [productsOpen, setProductsOpen] = useState(false);
  const totalProducts = productGroups.reduce((sum, g) => sum + g.products.length, 0);
  const grantedCount = Array.from(accessByProductId.values()).filter(
    (a) => a.allowApproved || a.allowPending
  ).length;

  return (
    <Fragment>
      <form action={updateDistribution} className="contents">
        <input type="hidden" name="operatorId" value={operator.id} />
        <div className="border-t border-border py-2 text-primary">{operator.name}</div>
        <div className="border-t border-border py-2 text-secondary">{operator.email}</div>
        <div className="border-t border-border py-2">{operatorStatusBadge(effectiveStatus)}</div>
        <div className="border-t border-border py-2">
          <Input
            type="number"
            name="weightApproved"
            min={0}
            max={100}
            defaultValue={operator.distributionRule?.weightApproved ?? 0}
            className="w-16 font-mono"
          />
        </div>
        <div className="border-t border-border py-2">
          <Input
            type="number"
            name="weightPending"
            min={0}
            max={100}
            defaultValue={operator.distributionRule?.weightPending ?? 0}
            className="w-16 font-mono"
          />
        </div>
        <div className="border-t border-border py-2">
          <Input
            type="number"
            name="weightDeclined"
            min={0}
            max={100}
            defaultValue={operator.distributionRule?.weightDeclined ?? 0}
            className="w-16 font-mono"
          />
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
          <Button type="submit" variant="secondary">
            Salvar
          </Button>
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
        <div className="col-span-12 rounded-lg border border-border bg-app p-3">
          <p className="mb-2 text-xs font-semibold text-secondary">
            Produtos liberados para {operator.name}
          </p>
          {totalProducts === 0 ? (
            <p className="text-xs text-muted">Nenhum produto ativo cadastrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {productGroups.map((group) => (
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
                          <Button type="submit" variant="secondary" className="ml-auto py-1 text-xs">
                            Salvar
                          </Button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Sem nenhum produto liberado, esse atendente participa da distribuição geral (% por
            categoria) normalmente. Limite/dia vazio = sem limite; ao bater o limite, o lead vai
            para outro atendente liberado, só ficando em espera se ninguém mais estiver
            disponível.
          </p>
        </div>
      )}
    </Fragment>
  );
}
