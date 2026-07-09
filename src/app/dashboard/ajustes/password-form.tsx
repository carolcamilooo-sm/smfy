"use client";

import { useActionState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword, type ActionState } from "./actions";

const initialState: ActionState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Senha atual</label>
        <Input name="currentPassword" type="password" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">Nova senha</label>
        <Input name="newPassword" type="password" minLength={6} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-neutral-400">
          Confirmar nova senha
        </label>
        <Input name="confirmPassword" type="password" minLength={6} required />
      </div>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-400">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
