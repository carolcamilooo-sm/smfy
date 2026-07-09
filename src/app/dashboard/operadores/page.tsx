import { prisma } from "@/lib/db";
import { getEffectiveStatus } from "@/lib/distribution";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createOperator, updateDistribution } from "./actions";

export const dynamic = "force-dynamic";

function operatorStatusBadge(status: string) {
  if (status === "ONLINE") return <Badge tone="green">Online</Badge>;
  if (status === "IDLE") return <Badge tone="yellow">Ocioso</Badge>;
  return <Badge tone="gray">Offline</Badge>;
}

export default async function OperadoresPage() {
  const operators = await prisma.user.findMany({
    where: { role: "OPERATOR" },
    include: { distributionRule: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">
          Distribuição de leads
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          O peso define a proporção de leads que cada operador recebe. Um
          operador com peso 2 recebe o dobro de leads de um com peso 1,
          desde que esteja online e não esteja ocioso há mais de 15 minutos.
        </p>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_1.5fr_auto_5rem_8rem_auto] items-center gap-x-4 gap-y-2 text-sm">
            <div className="text-xs text-neutral-500">Nome</div>
            <div className="text-xs text-neutral-500">E-mail</div>
            <div className="text-xs text-neutral-500">Status</div>
            <div className="text-xs text-neutral-500">Peso</div>
            <div className="text-xs text-neutral-500">Ativo</div>
            <div />

            {operators.map((op) => (
              <form
                key={op.id}
                action={updateDistribution}
                className="contents"
              >
                <input type="hidden" name="operatorId" value={op.id} />
                <div className="border-t border-neutral-800 py-2">{op.name}</div>
                <div className="border-t border-neutral-800 py-2 text-neutral-400">
                  {op.email}
                </div>
                <div className="border-t border-neutral-800 py-2">
                  {operatorStatusBadge(getEffectiveStatus(op))}
                </div>
                <div className="border-t border-neutral-800 py-2">
                  <Input
                    type="number"
                    name="weight"
                    min={0}
                    defaultValue={op.distributionRule?.weight ?? 1}
                    className="w-20"
                  />
                </div>
                <div className="border-t border-neutral-800 py-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={op.distributionRule?.active ?? true}
                    className="h-4 w-4"
                  />
                </div>
                <div className="border-t border-neutral-800 py-2">
                  <Button type="submit" variant="secondary">
                    Salvar
                  </Button>
                </div>
              </form>
            ))}

            {operators.length === 0 && (
              <div className="col-span-6 py-4 text-center text-neutral-500">
                Nenhum operador cadastrado ainda.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">
          Novo operador
        </h2>
        <form action={createOperator} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Nome</label>
            <Input name="name" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">E-mail</label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Senha</label>
            <Input name="password" type="password" minLength={6} required />
          </div>
          <Button type="submit" className="w-full">
            Criar operador
          </Button>
        </form>
      </Card>
    </div>
  );
}
