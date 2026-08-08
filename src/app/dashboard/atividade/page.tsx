import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BR_TIMEZONE, startOfDayString, endOfDayString } from "@/lib/date-br";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const selectClass =
  "rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-secondary focus:border-accent focus:outline-none";

export default async function AtividadePage({
  searchParams,
}: {
  searchParams: Promise<{ colaborador?: string; dia?: string; page?: string }>;
}) {
  const session = await auth();
  // Aba só do dono: acompanha o que os colaboradores fizeram.
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { colaborador, dia, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);

  const where: Prisma.ActivityLogWhereInput = {};
  if (colaborador) where.actorId = colaborador;
  if (dia) where.createdAt = { gte: startOfDayString(dia), lte: endOfDayString(dia) };

  const [colaboradores, total, logs] = await Promise.all([
    prisma.user.findMany({
      where: { role: "COLLABORATOR" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (colaborador) params.set("colaborador", colaborador);
    if (dia) params.set("dia", dia);
    params.set("page", String(target));
    return `?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Atividade dos colaboradores
        </h1>
        <p className="text-sm text-secondary">
          O que cada colaborador fez no painel (inclui o login). Só você, como
          dono, enxerga esta aba. Suas próprias ações não são registradas aqui.
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-3">
        <select name="colaborador" defaultValue={colaborador ?? ""} className={selectClass}>
          <option value="">Todos os colaboradores</option>
          {colaboradores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="date" name="dia" defaultValue={dia ?? ""} aria-label="Dia" className={selectClass} />
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <Card>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-secondary">
            {colaboradores.length === 0
              ? "Nenhum colaborador cadastrado ainda."
              : "Nenhuma atividade registrada para este filtro."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-secondary">
                  <th className="pb-2 pr-4">Quando</th>
                  <th className="pb-2 pr-4">Colaborador</th>
                  <th className="pb-2">O que fez</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-muted">
                      {new Date(l.createdAt).toLocaleString("pt-BR", { timeZone: BR_TIMEZONE })}
                    </td>
                    <td className="py-2 pr-4 text-primary">{l.actorName}</td>
                    <td className="py-2 text-secondary">
                      {l.action === "login" ? (
                        <span className="text-accent">🔑 {l.summary}</span>
                      ) : (
                        l.summary
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between text-xs text-secondary">
        <div>
          <span className="font-mono">{total}</span> registro(s)
        </div>
        {totalPages > 1 && (
          <div className="flex gap-1.5">
            <Link
              href={pageHref(Math.max(1, currentPage - 1))}
              className="rounded border border-border bg-surface px-3 py-1.5 text-secondary hover:border-accent/50"
            >
              ← Anterior
            </Link>
            <span className="px-2 py-1.5">
              {currentPage} / {totalPages}
            </span>
            <Link
              href={pageHref(Math.min(totalPages, currentPage + 1))}
              className="rounded border border-border bg-surface px-3 py-1.5 text-secondary hover:border-accent/50"
            >
              Próximo →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
