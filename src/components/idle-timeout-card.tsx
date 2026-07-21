"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

type Operador = { id: string; name: string; idleTimeoutMinutes: number };

/** Uma linha por atendente: nome + campo de minutos + salvar. */
function LinhaOperador({
  op,
  salvar,
}: {
  op: Operador;
  salvar: (fd: FormData) => Promise<void>;
}) {
  return (
    <form
      action={salvar}
      className="flex items-center gap-2 rounded-lg border border-border bg-app px-3 py-2"
    >
      <input type="hidden" name="operatorId" value={op.id} />
      <span className="min-w-0 flex-1 truncate text-sm text-primary">{op.name}</span>
      <Input
        name="idleTimeoutMinutes"
        type="number"
        min={2}
        max={120}
        defaultValue={op.idleTimeoutMinutes}
        className="h-8 w-16 py-1 text-center font-mono"
      />
      <span className="text-[11px] text-muted">min</span>
      <SubmitButton variant="secondary" className="py-1 text-xs">
        Salvar
      </SubmitButton>
    </form>
  );
}

export function IdleTimeoutCard({
  operadores,
  salvar,
}: {
  operadores: Operador[];
  salvar: (fd: FormData) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);

  // Quantos fogem do padrão de 10 min — resumo pra fechar sem abrir.
  const ajustados = operadores.filter((o) => o.idleTimeoutMinutes !== 10);

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-title">Tempo até ficar ocioso</h2>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-xs font-semibold text-secondary hover:text-primary"
        >
          {aberto ? "Fechar" : "Ajustar"}
        </button>
      </div>
      <p className="mb-4 text-xs text-secondary">
        Minutos sem atividade até o atendente ficar ocioso — para de receber lead
        e o navegador o põe offline. Padrão de 10 min; suba para quem precisa de
        pausas maiores sem sair da fila.
      </p>

      {!aberto && (
        <p className="text-xs text-muted">
          {ajustados.length === 0
            ? "Todos no padrão de 10 min."
            : `Fora do padrão: ${ajustados.map((o) => `${o.name.split(" ")[0]} (${o.idleTimeoutMinutes}min)`).join(", ")}`}
        </p>
      )}

      {aberto && (
        <div className="grid gap-2 sm:grid-cols-2">
          {operadores.map((op) => (
            <LinhaOperador key={op.id} op={op} salvar={salvar} />
          ))}
        </div>
      )}
    </Card>
  );
}
