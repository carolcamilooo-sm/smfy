"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { CollaboratorState } from "@/app/dashboard/ajustes/collaborator-actions";

const initialState: CollaboratorState = {};

export function CollaboratorForm({
  createCollaborator,
}: {
  createCollaborator: (
    prev: CollaboratorState,
    formData: FormData
  ) => Promise<CollaboratorState>;
}) {
  const [state, formAction, pending] = useActionState(createCollaborator, initialState);

  return (
    <div className="border-t border-border pt-4">
      <form
        action={formAction}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1.2fr_1.4fr_1fr_auto] sm:items-end"
      >
        <div>
          <label className="mb-1.5 block text-xs text-secondary">Nome</label>
          <Input name="name" placeholder="Nome do colaborador" required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-secondary">E-mail</label>
          <Input name="email" type="email" placeholder="email@exemplo.com" required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-secondary">Senha</label>
          <Input
            name="password"
            type="password"
            placeholder="6+ caracteres"
            minLength={6}
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Cadastrando…" : "Cadastrar"}
        </Button>
      </form>

      {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-success">{state.success}</p>}
    </div>
  );
}
