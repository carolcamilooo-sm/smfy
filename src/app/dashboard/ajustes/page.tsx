import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "@/components/password-form";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Ajustes</h1>
        <p className="text-sm text-secondary">
          Gerencie seus dados de perfil e senha.
        </p>
      </div>

      <Card className="max-w-xl">
        <h2 className="mb-4 text-sm font-semibold text-primary">Perfil</h2>
        <ProfileForm name={user.name} email={user.email} />
      </Card>

      <Card className="max-w-xl">
        <h2 className="mb-4 text-sm font-semibold text-primary">Senha</h2>
        <PasswordForm />
      </Card>
    </div>
  );
}
