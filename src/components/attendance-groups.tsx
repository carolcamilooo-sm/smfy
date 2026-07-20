"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmForm } from "@/components/confirm-form";

type Group = {
  id: string;
  name: string;
  weightApproved: number;
  active: boolean;
  memberCount: number;
  memberIds: string[];
};

type Operator = { id: string; name: string };

type Action = (fd: FormData) => Promise<void>;

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
  // O "Remover grupo" tem form próprio, e um form dentro de outro é HTML
  // inválido: o botão de dentro acabava submetendo o de fora, então Remover
  // salvava em vez de apagar. O form de remover fica ao lado, e o botão se
  // liga a ele pelo atributo `form` — assim os dois botões seguem lado a lado.
  const removeFormId = `remove-group-${group.id}`;

  return (
    <>
    <form action={updateGroup} className="rounded-lg border border-border bg-app p-3">
      <input type="hidden" name="id" value={group.id} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px] flex-1">
          <span className="mb-1 block text-[11px] text-muted">Nome do grupo</span>
          <Input name="name" defaultValue={group.name} required className="h-8 py-1 text-sm" />
        </div>
        {/* Só aprovados: o grupo existe pra privilegiar quem converte melhor
            nas vendas. Pendente e recusado esses mesmos atendentes recebem
            pelo rodízio normal, junto com o resto da equipe. */}
        <div className="w-20">
          <span className="mb-1 block text-[11px] text-muted">% Aprovados</span>
          <Input
            name="weightApproved"
            type="number"
            min={0}
            max={100}
            defaultValue={group.weightApproved}
            className="h-8 py-1 text-center text-sm"
          />
        </div>
        <label className="flex items-center gap-1.5 pb-1.5 text-xs text-secondary">
          <input type="checkbox" name="active" defaultChecked={group.active} className="h-3.5 w-3.5" />
          Ativo
        </label>
      </div>

      {/* Contas do grupo */}
      <div className="mt-3 border-t border-border pt-3">
        <span className="mb-2 block text-[11px] text-muted">
          Quem faz parte do {group.name} (a % acima é dividida entre os
          marcados). A mesma pessoa pode estar em vários grupos — marcar aqui
          não tira ela dos outros.
        </span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
          {operators.map((op) => (
            <label key={op.id} className="flex items-center gap-2 text-xs text-secondary">
              <input
                type="checkbox"
                name="member"
                value={op.id}
                defaultChecked={group.memberIds.includes(op.id)}
                className="h-3.5 w-3.5"
              />
              <span className="truncate">{op.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
        <SubmitButton variant="secondary" className="py-1 text-xs">
          Salvar
        </SubmitButton>
        <Button type="submit" form={removeFormId} variant="danger" className="py-1 text-xs">
          Remover grupo
        </Button>
      </div>
    </form>

    <ConfirmForm
      id={removeFormId}
      action={removeGroup}
      confirmMessage={`Remover o grupo "${group.name}"? As ${group.memberCount} conta(s) perdem a fatia das vendas deste grupo; a participação delas em outros grupos continua.`}
    >
      <input type="hidden" name="id" value={group.id} />
    </ConfirmForm>
    </>
  );
}

function CreateGroupForm({ createGroup }: { createGroup: Action }) {
  return (
    <form action={createGroup} className="flex items-center gap-2">
      <Input name="name" placeholder="Nome do novo grupo (ex: Tales)" className="h-9" required />
      <SubmitButton variant="secondary" savedMessage="Grupo criado" pendingLabel="Criando…">
        Criar grupo
      </SubmitButton>
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
        <strong>Só quem está num grupo recebe venda aprovada.</strong> A % diz
        como as vendas se repartem entre os grupos: dois grupos de 20% ficam com
        metade cada, e um de 40% contra um de 20% fica com o dobro. Dentro do
        grupo, a fatia se divide entre as contas dele.
      </p>
      <p className="mb-4 text-xs text-muted">
        Pendentes e recusados essas mesmas contas recebem pelo rodízio normal,
        junto com a equipe toda. Se uma conta do grupo cai, as outras absorvem a
        fatia dela; se o grupo inteiro sai, a fatia vai pros outros grupos. Sem
        nenhum grupo disponível, a venda aprovada fica em espera.
      </p>

      {!expanded && groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <span
              key={g.id}
              className="rounded-lg border border-border bg-app px-3 py-1.5 text-xs text-secondary"
            >
              <span className="font-semibold text-primary">{g.name}</span> ·{" "}
              {g.memberCount} conta(s) · {g.weightApproved}% dos aprovados
              {!g.active && " · inativo"}
            </span>
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-4">
          {groups.map((g) => (
            // A key carrega o estado que veio do servidor, e não só o id. Os
            // campos aqui são não controlados (defaultValue/defaultChecked):
            // quando o dado muda, o React re-renderiza mas não mexe no que já
            // está no DOM, então a tela mentiria até um F5 — foi o que
            // acontecia ao mover alguém de grupo. Mudando a key, o formulário
            // remonta e volta a refletir o banco.
            <GroupForm
              key={[g.id, g.name, g.weightApproved, g.active, [...g.memberIds].sort().join(",")].join("|")}
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
