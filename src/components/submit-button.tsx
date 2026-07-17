"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/toaster";
import type { ComponentProps } from "react";

/**
 * Botão de submit que confirma com um pop-up quando a ação do form termina.
 *
 * Lê o pending do form pai (useFormStatus) e, na transição de "enviando" pra
 * "pronto", dispara o toast. É um dispatchEvent num efeito (side effect legítimo
 * sincronizando com o Toaster global), não setState em efeito.
 */
export function SubmitButton({
  children = "Salvar",
  savedMessage = "Salvo",
  pendingLabel = "Salvando…",
  ...props
}: ComponentProps<typeof Button> & { savedMessage?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) toast(savedMessage);
    wasPending.current = pending;
  }, [pending, savedMessage]);

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
