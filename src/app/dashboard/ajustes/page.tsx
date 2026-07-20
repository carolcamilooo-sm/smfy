import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmForm } from "@/components/confirm-form";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "@/components/password-form";
import { createCollaborator, removeCollaborator } from "./collaborator-actions";
import { CollaboratorForm } from "@/components/collaborator-form";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const session = await auth();
  const isAdmin = session!.user.role === "ADMIN";
  const [user, collaborators] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: session!.user.id },
    }),
    isAdmin
      ? prisma.user.findMany({
          where: { role: "COLLABORATOR" },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Ajustes</h1>
        <p className="text-sm text-secondary">
          Gerencie seus dados de perfil e senha.
        </p>
      </div>

      <Card className="max-w-xl">
        <h2 className="mb-4 text-sm font-semibold text-title">Perfil</h2>
        <ProfileForm name={user.name} email={user.email} />
      </Card>

      <Card className="max-w-xl">
        <h2 className="mb-4 text-sm font-semibold text-title">Senha</h2>
        <PasswordForm />
      </Card>

      {isAdmin && (
        <Card className="max-w-2xl">
          <h2 className="mb-1 text-sm font-semibold text-title">
            Colaboradores do admin
          </h2>
          <p className="mb-4 text-xs text-secondary">
            Têm acesso completo ao Dashboard, Produtores, Equipe de
            Atendimento, Integrações e Histórico — mas não podem cadastrar
            outros colaboradores.
          </p>

          {collaborators.length > 0 && (
            <div className="mb-4 space-y-2">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3 first:border-t-0"
                >
                  <div>
                    <p className="text-sm text-primary">{c.name}</p>
                    <p className="text-xs text-secondary">{c.email}</p>
                  </div>
                  <ConfirmForm
                    action={removeCollaborator}
                    confirmMessage={`Remover o acesso de "${c.name}"? Essa ação não pode ser desfeita.`}
                  >
                    <input type="hidden" name="collaboratorId" value={c.id} />
                    <Button type="submit" variant="danger">
                      Remover
                    </Button>
                  </ConfirmForm>
                </div>
              ))}
            </div>
          )}

          <CollaboratorForm createCollaborator={createCollaborator} />
        </Card>
      )}
    </div>
  );
}
