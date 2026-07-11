"use client";

import { useActionState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePassword, type ActionState } from "@/lib/account-actions";

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
        <label className="mb-1 block text-xs text-secondary">Senha atual</label>
        <Input name="currentPassword" type="password" required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-secondary">Nova senha</label>
        <Input name="newPassword" type="password" minLength={6} required />
      </div>
      <div>
        <label className="mb-1 block text-xs text-secondary">
          Confirmar nova senha
        </label>
        <Input name="confirmPassword" type="password" minLength={6} required />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
