"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

type Action = (fd: FormData) => Promise<void>;

/**
 * Mural de recados na barra lateral.
 *
 * O admin escreve e salva; o atendente só lê. É o mesmo componente nos dois
 * painéis de propósito — assim o que você escreve aparece exatamente como a
 * equipe vai ver, sem surpresa.
 */
export function GlobalNoticeCard({
  content,
  authorName,
  updatedAt,
  podeEditar,
  save,
}: {
  content: string | null;
  authorName: string | null;
  updatedAt: Date | string | null;
  podeEditar: boolean;
  save?: Action;
}) {
  const [aberto, setAberto] = useState(false);

  // Pro atendente, sem recado não há caixa: uma moldura vazia na barra lateral
  // só ocuparia espaço e faria pensar que algo quebrou.
  if (!podeEditar && !content) return null;

  const quando = updatedAt
    ? new Date(updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Aviso
        </span>
        {podeEditar && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="text-[11px] font-semibold text-secondary hover:text-primary"
          >
            {aberto ? "Fechar" : content ? "Editar" : "Escrever"}
          </button>
        )}
      </div>

      {!aberto && (
        <>
          {content ? (
            // whitespace-pre-wrap: quebra de linha que o admin digitou aparece
            // como ele escreveu, e não vira um parágrafo corrido.
            <p className="whitespace-pre-wrap break-words text-xs text-primary">{content}</p>
          ) : (
            <p className="text-xs text-muted">
              Nenhum aviso. O que você escrever aqui aparece pra toda a equipe.
            </p>
          )}
          {content && (authorName || quando) && (
            <p className="mt-1.5 text-[10px] text-muted">
              {authorName}
              {authorName && quando && " · "}
              {quando}
            </p>
          )}
        </>
      )}

      {aberto && podeEditar && save && (
        <form action={save} className="space-y-2">
          <textarea
            name="content"
            defaultValue={content ?? ""}
            rows={4}
            maxLength={500}
            placeholder="Ex: Hoje o CNP está com fila alta, prioridade nos pagos."
            className="w-full rounded-md border border-border bg-app px-2.5 py-2 text-xs text-primary focus:border-accent focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted">Vazio apaga o aviso</span>
            <SubmitButton variant="secondary" className="py-1 text-[11px]" savedMessage="Aviso publicado">
              Publicar
            </SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
