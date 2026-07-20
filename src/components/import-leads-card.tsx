"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ResumoImportacao } from "@/app/dashboard/produtores/import-actions";

type Acao = (prev: ResumoImportacao, fd: FormData) => Promise<ResumoImportacao>;

type Produtor = { id: string; name: string; products: { id: string; name: string }[] };

const vazio: ResumoImportacao = {};

/**
 * Importação em dois passos, cada um no seu próprio formulário e com sua
 * própria ação.
 *
 * Já tentei fazer com um formulário só e uma marcação de "confirmado": o React
 * serializa o form pelo estado que ele conhece, e a marcação chegava sempre
 * como "não" — o segundo clique repetia a conferência em vez de gravar. Dois
 * formulários separados não têm o que interpretar.
 *
 * O passo de gravar reenvia o conteúdo do arquivo, e não o arquivo: assim não
 * depende de a seleção continuar viva no input entre um passo e outro.
 */
export function ImportLeadsCard({
  produtores,
  analisar,
  importar,
}: {
  produtores: Produtor[];
  analisar: Acao;
  importar: Acao;
}) {
  const [analise, analisarAction, analisando] = useActionState(analisar, vazio);
  const [resultado, importarAction, importando] = useActionState(importar, vazio);
  const [produtorId, setProdutorId] = useState("");
  const [productId, setProductId] = useState("");
  const [temArquivo, setTemArquivo] = useState(false);

  const produtor = produtores.find((p) => p.id === produtorId);
  const importou = resultado.importados !== undefined;
  const conferido = !importou && analise.novos !== undefined && !analise.erro;

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-title">Importar planilha da Disrupty</h2>
      <p className="mb-4 text-xs text-secondary">
        Sobe o export de vendas da Disrupty e traz os leads pra fila. Lead que
        já está no sistema — inclusive os que chegaram pelo webhook — não entra
        duas vezes: a comparação é pelo <strong>ID da transação</strong>.
      </p>

      <form action={analisarAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-muted">Produtor dono desses leads</label>
            <select
              name="producerId"
              value={produtorId}
              onChange={(e) => setProdutorId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none"
            >
              <option value="">Escolha…</option>
              {produtores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-muted">
              Produto (a planilha não traz essa informação)
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={!produtor}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none disabled:opacity-50"
            >
              <option value="">Sem produto</option>
              {produtor?.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-muted">Arquivo .csv</label>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => setTemArquivo(Boolean(e.target.files?.length))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-surface-raised file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary"
          />
        </div>

        <Button type="submit" variant="secondary" disabled={analisando || !temArquivo || !produtorId}>
          {analisando ? "Lendo…" : "Conferir planilha"}
        </Button>
      </form>

      {analise.erro && !importou && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 p-3">
          <p className="text-sm text-danger">{analise.erro}</p>
          {analise.colunas && analise.colunas.length > 0 && (
            <p className="mt-1.5 font-mono text-[11px] text-muted">
              Colunas encontradas: {analise.colunas.join(" · ")}
            </p>
          )}
        </div>
      )}

      {conferido && (
        <div className="mt-4 rounded-lg border border-border bg-app p-3.5">
          <p className="mb-2 text-xs font-semibold text-secondary">
            {analise.total} linhas lidas — nada foi gravado ainda
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="text-primary">
              <span className="font-mono font-semibold text-success">{analise.novos}</span> novos
            </span>
            <span className="text-secondary">
              <span className="font-mono font-semibold">{analise.jaExistem}</span> já no sistema
            </span>
            {analise.problemas && analise.problemas.length > 0 && (
              <span className="text-warning">
                <span className="font-mono font-semibold">{analise.problemas.length}</span> com
                problema
              </span>
            )}
          </div>
          {analise.porTipo && (analise.novos ?? 0) > 0 && (
            <p className="mt-2 text-xs text-secondary">
              Dos novos: <strong>{analise.porTipo.aprovados}</strong> pagos ·{" "}
              <strong>{analise.porTipo.pendentes}</strong> pendentes ·{" "}
              <strong>{analise.porTipo.recusados}</strong> recusados
              {analise.porTipo.outros > 0 && ` · ${analise.porTipo.outros} outros`}
            </p>
          )}
          <Problemas lista={analise.problemas} />

          {(analise.novos ?? 0) > 0 ? (
            <form action={importarAction} className="mt-3">
              <input type="hidden" name="producerId" value={produtorId} />
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="csv" value={analise.csv ?? ""} />
              <Button type="submit" disabled={importando}>
                {importando ? "Importando…" : `Importar ${analise.novos} leads`}
              </Button>
            </form>
          ) : (
            <p className="mt-2 text-xs text-muted">
              Nenhum lead novo — essa planilha já foi importada, ou os leads já
              tinham entrado pelo webhook.
            </p>
          )}
        </div>
      )}

      {importou && (
        <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-3.5">
          <p className="text-sm text-success">
            <strong>{resultado.importados}</strong> leads importados
            {(resultado.jaExistem ?? 0) > 0 &&
              ` · ${resultado.jaExistem} já existiam e foram ignorados`}
          </p>
          <p className="mt-1.5 text-xs text-secondary">
            Entraram como <strong>em espera</strong> e vão sendo entregues aos
            atendentes conforme eles ficarem disponíveis, pelas mesmas regras de
            sempre.
          </p>
          <Problemas lista={resultado.problemas} />
        </div>
      )}
    </Card>
  );
}

function Problemas({ lista }: { lista?: { linha: number; motivo: string; conteudo: string }[] }) {
  if (!lista || lista.length === 0) return null;
  return (
    <details className="mt-2.5">
      <summary className="cursor-pointer text-xs text-secondary hover:text-primary">
        Ver linhas com problema ({lista.length})
      </summary>
      <ul className="mt-1.5 space-y-1">
        {lista.map((p) => (
          <li key={p.linha} className="font-mono text-[11px] text-muted">
            linha {p.linha}: {p.motivo} — {p.conteudo}
          </li>
        ))}
      </ul>
    </details>
  );
}
