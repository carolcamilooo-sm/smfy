import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "@/components/password-form";
import { NotificationToggle } from "@/components/notification-toggle";

export const dynamic = "force-dynamic";

export default async function AjustesAtendentePage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
  });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Ajustes</h1>
        <p className="text-sm text-secondary">
          Gerencie seus dados de perfil, senha e notificações.
        </p>
      </div>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">Perfil</h2>
        <ProfileForm name={user.name} email={user.email} />
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">Senha</h2>
        <PasswordForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">Notificações</h2>
        <NotificationToggle
          field="notifySound"
          label="Som ao receber novo lead"
          initialValue={user.notifySound}
        />
        <NotificationToggle
          field="notifyIdleWarning"
          label="Aviso antes de ficar inativo por tempo ocioso"
          initialValue={user.notifyIdleWarning}
        />
      </Card>
    </div>
  );
}
