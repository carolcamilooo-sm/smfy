"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export const TOAST_EVENT = "smfy:toast";

/** Dispara um pop-up de confirmação de qualquer lugar do cliente. */
export function toast(message = "Salvo") {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

type Toast = { id: number; message: string };

/**
 * Pop-ups no canto da tela. Fica montado uma vez no layout e escuta o evento
 * global — qualquer SubmitButton que completa dispara um. Some sozinho.
 */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let seq = 0;
    function onToast(e: Event) {
      const message = (e as CustomEvent<string>).detail ?? "Salvo";
      const id = ++seq;
      setToasts((list) => [...list, { id, message }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 2600);
    }
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/40 bg-surface px-4 py-3 shadow-[0_8px_30px_oklch(0_0_0_/_0.3)]"
          style={{ animation: "toastIn 0.2s ease-out" }}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15">
            <Check size={13} className="text-success" />
          </span>
          <span className="text-sm font-medium text-primary">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
