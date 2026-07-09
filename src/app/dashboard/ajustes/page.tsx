import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-lg font-semibold">Ajustes da conta</h1>
        <p className="text-xs text-neutral-500">
          Atualize seus dados de acesso ao painel.
        </p>
      </div>

      <Card className="max-w-md">
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">Perfil</h2>
        <ProfileForm name={user.name} email={user.email} />
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-4 text-sm font-semibold text-neutral-200">Senha</h2>
        <PasswordForm />
      </Card>
    </div>
  );
}
