"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfile, type ActionState } from "@/lib/account-actions";

const initialState: ActionState = {};

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-secondary">Nome</label>
        <Input name="name" defaultValue={name} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-secondary">E-mail</label>
        <Input name="email" type="email" defaultValue={email} required />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
