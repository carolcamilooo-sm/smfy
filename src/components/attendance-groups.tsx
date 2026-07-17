"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";

type Group = {
  id: string;
  name: string;
  weightApproved: number;
  weightPending: number;
  weightDeclined: number;
  active: boolean;
  memberCount: number;
};

type Operator = { id: string; name: string; groupId: string | null };

export function AttendanceGroups({
  groups,
  operators,
  createGroup,
  updateGroup,
  removeGroup,
  setOperatorGroup,
}: {
  groups: Group[];
  operators: Operator[];
  createGroup: (fd: FormData) => void;
  updateGroup: (fd: FormData) => void;
  removeGroup: (fd: FormData) => void;
  setOperatorGroup: (fd: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-title">Grupos de atendimento</h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-secondary hover:text-primary"
        >
          {expanded ? "Fechar" : "Gerenciar"}
        </button>
      </div>
      <p className="mb-4 text-xs text-secondary">
        Uma pessoa com várias contas (ex: automações em máquinas diferentes). O
        grupo tem uma % por categoria, dividida entre as contas online — se uma
        cai, as outras absorvem, mantendo o total do grupo.
      </p>

      {!expanded && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <span
              key={g.id}
              className="rounded-lg border border-border bg-app px-3 py-1.5 text-xs text-secondary"
            >
              <span className="font-semibold text-primary">{g.name}</span> ·{" "}
              {g.memberCount} conta(s) · {g.weightApproved}/{g.weightPending}/{g.weightDeclined}%
              {!g.active && " · inativo"}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-5">
          {/* Grupos existentes */}
          {groups.map((g) => (
            <form
              key={g.id}
              action={updateGroup}
              className="rounded-lg border border-border bg-app p-3"
            >
              <input type="hidden" name="id" value={g.id} />
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[140px] flex-1">
                  <span className="mb-1 block text-[11px] text-muted">Nome</span>
                  <Input name="name" defaultValue={g.name} required className="h-8 py-1 text-sm" />
                </div>
                {(
                  [
                    ["weightApproved", "% Aprov", g.weightApproved],
                    ["weightPending", "% Pend", g.weightPending],
                    ["weightDeclined", "% Recus", g.weightDeclined],
                  ] as const
                ).map(([field, label, val]) => (
                  <div key={field} className="w-16">
                    <span className="mb-1 block text-[11px] text-muted">{label}</span>
                    <Input
                      name={field}
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={val}
                      className="h-8 py-1 text-center text-sm"
                    />
                  </div>
                ))}
                <label className="flex items-center gap-1.5 pb-1.5 text-xs text-secondary">
                  <input type="checkbox" name="active" defaultChecked={g.active} className="h-3.5 w-3.5" />
                  Ativo
                </label>
                <Button type="submit" variant="secondary" className="py-1 text-xs">
                  Salvar
                </Button>
                <ConfirmForm
                  action={removeGroup}
                  confirmMessage={`Remover o grupo "${g.name}"? As ${g.memberCount} conta(s) voltam a ser individuais (peso próprio).`}
                >
                  <input type="hidden" name="id" value={g.id} />
                  <Button type="submit" variant="danger" className="py-1 text-xs">
                    Remover
                  </Button>
                </ConfirmForm>
              </div>
            </form>
          ))}

          {/* Criar grupo */}
          <form action={createGroup} className="flex gap-2">
            <Input name="name" placeholder="Nome do novo grupo (ex: Tales)" className="h-9" />
            <Button type="submit" variant="secondary">
              Criar grupo
            </Button>
          </form>

          {/* Atribuição conta → grupo */}
          {groups.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold text-secondary">
                Contas por grupo
              </p>
              <div className="space-y-1.5">
                {operators.map((op) => (
                  <form
                    key={op.id}
                    action={setOperatorGroup}
                    className="flex items-center gap-3 rounded-md border border-border bg-app px-3 py-2"
                  >
                    <input type="hidden" name="operatorId" value={op.id} />
                    <span className="w-44 shrink-0 truncate text-xs text-primary">{op.name}</span>
                    <select
                      name="groupId"
                      defaultValue={op.groupId ?? ""}
                      className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-primary focus:border-accent focus:outline-none"
                    >
                      <option value="">Individual (peso próprio)</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" className="py-1 text-xs">
                      Salvar
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
