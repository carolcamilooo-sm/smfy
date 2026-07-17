"use client";

import { useActionState, useState } from "react";
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

type Action = (fd: FormData) => Promise<void>;

/** Botão de salvar que mostra "✓ Salvo" depois que a action completa. */
function SaveButton({ pending, saved }: { pending: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="submit" variant="secondary" disabled={pending} className="py-1 text-xs">
        {pending ? "Salvando…" : "Salvar"}
      </Button>
      {saved && !pending && (
        <span className="text-xs font-semibold text-success">✓ Salvo</span>
      )}
    </div>
  );
}

/** Um grupo: nome, pesos, ativo e as contas (checkboxes) — tudo salvo junto. */
function GroupForm({
  group,
  operators,
  updateGroup,
  removeGroup,
}: {
  group: Group;
  operators: Operator[];
  updateGroup: Action;
  removeGroup: Action;
}) {
  // useActionState (não useState+effect): a action retorna um carimbo, e é ele
  // que sinaliza "salvou" — sem escrever state dentro de efeito.
  const [savedAt, formAction, pending] = useActionState<number, FormData>(
    async (_prev, fd) => {
      await updateGroup(fd);
      return Date.now();
    },
    0
  );

  return (
    <form action={formAction} className="rounded-lg border border-border bg-app p-3">
      <input type="hidden" name="id" value={group.id} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1">
          <span className="mb-1 block text-[11px] text-muted">Nome do grupo</span>
          <Input name="name" defaultValue={group.name} required className="h-8 py-1 text-sm" />
        </div>
        {(
          [
            ["weightApproved", "% Aprov", group.weightApproved],
            ["weightPending", "% Pend", group.weightPending],
            ["weightDeclined", "% Recus", group.weightDeclined],
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
          <input type="checkbox" name="active" defaultChecked={group.active} className="h-3.5 w-3.5" />
          Ativo
        </label>
      </div>

      {/* Contas do grupo */}
      <div className="mt-3 border-t border-border pt-3">
        <span className="mb-2 block text-[11px] text-muted">
          Contas deste operador (marque as contas do {group.name})
        </span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {operators.map((op) => {
            const emOutroGrupo = op.groupId !== null && op.groupId !== group.id;
            return (
              <label
                key={op.id}
                className={
                  "flex items-center gap-2 text-xs " +
                  (emOutroGrupo ? "text-muted" : "text-secondary")
                }
                title={emOutroGrupo ? "Está em outro grupo; marcar aqui move pra cá" : undefined}
              >
                <input
                  type="checkbox"
                  name="member"
                  value={op.id}
                  defaultChecked={op.groupId === group.id}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">
                  {op.name}
                  {emOutroGrupo && " ↗"}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
        <SaveButton pending={pending} saved={savedAt > 0} />
        <ConfirmForm
          action={removeGroup}
          confirmMessage={`Remover o grupo "${group.name}"? As ${group.memberCount} conta(s) voltam a ser individuais (peso próprio).`}
        >
          <input type="hidden" name="id" value={group.id} />
          <Button type="submit" variant="danger" className="py-1 text-xs">
            Remover grupo
          </Button>
        </ConfirmForm>
      </div>
    </form>
  );
}

function CreateGroupForm({ createGroup }: { createGroup: Action }) {
  const [savedAt, formAction, pending] = useActionState<number, FormData>(
    async (_prev, fd) => {
      await createGroup(fd);
      return Date.now();
    },
    0
  );
  return (
    <form action={formAction} className="flex items-center gap-2">
      <Input name="name" placeholder="Nome do novo grupo (ex: Tales)" className="h-9" required />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Criando…" : "Criar grupo"}
      </Button>
      {savedAt > 0 && !pending && (
        <span className="text-xs font-semibold text-success">✓ Criado</span>
      )}
    </form>
  );
}

export function AttendanceGroups({
  groups,
  operators,
  createGroup,
  updateGroup,
  removeGroup,
}: {
  groups: Group[];
  operators: Operator[];
  createGroup: Action;
  updateGroup: Action;
  removeGroup: Action;
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
        <div className="space-y-4">
          {groups.map((g) => (
            <GroupForm
              key={g.id}
              group={g}
              operators={operators}
              updateGroup={updateGroup}
              removeGroup={removeGroup}
            />
          ))}
          <CreateGroupForm createGroup={createGroup} />
        </div>
      )}
    </Card>
  );
}
