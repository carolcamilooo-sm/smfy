import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getBaseUrl } from "@/lib/base-url";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile-form";
import { PasswordForm } from "@/components/password-form";
import { NotificationToggle } from "@/components/notification-toggle";
import { SalesWebhookCard } from "@/components/sales-webhook-card";
import { generateSalesWebhookToken } from "./sales-webhook-actions";

export const dynamic = "force-dynamic";

export default async function AjustesAtendentePage() {
  const session = await auth();
  const [user, baseUrl, approvedCount, pendingCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } }),
    getBaseUrl(),
    prisma.operatorSale.count({
      where: { operatorId: session!.user.id, paymentStatus: "APPROVED" },
    }),
    prisma.operatorSale.count({
      where: { operatorId: session!.user.id, paymentStatus: "PENDING" },
    }),
  ]);

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

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-primary">
          Meu webhook de vendas
        </h2>
        <SalesWebhookCard
          baseUrl={baseUrl}
          token={user.salesWebhookToken}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
          generateToken={generateSalesWebhookToken}
        />
      </Card>
    </div>
  );
}
