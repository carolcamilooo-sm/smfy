import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { OperatorSidebarNav } from "@/components/operator-sidebar-nav";
import { OnlineStatusCard } from "@/components/online-status-card";
import { OperatorLeadToast } from "@/components/operator-lead-toast";
import { SidebarClock } from "@/components/sidebar-clock";
import { SpotlightPointer } from "@/components/ui/spotlight-card";
import { SignOutButton } from "@/components/sign-out-button";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function AtendimentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const name = session?.user.name ?? "";
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { status: true, notifySound: true, notifyIdleWarning: true },
  });

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-app p-4">
        <div className="mb-6 px-2">
          <Logo className="text-2xl" />
        </div>

        <OperatorSidebarNav />
        <OnlineStatusCard
          initialStatus={user.status}
          notifyIdleWarning={user.notifyIdleWarning}
        />

        <div className="mt-auto flex flex-col gap-3">
          <SidebarClock />
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {initials(name) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">{name}</p>
              <p className="text-xs text-secondary">Atendente</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main data-glow-scope className="relative flex-1 px-10 py-8">
        <SpotlightPointer />
        <OperatorLeadToast operatorId={session!.user.id} notifySound={user.notifySound} />
        {children}
      </main>
    </div>
  );
}
