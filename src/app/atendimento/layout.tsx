import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { OperatorSidebarNav } from "@/components/operator-sidebar-nav";
import { OnlineStatusCard } from "@/components/online-status-card";
import { OperatorLeadToast } from "@/components/operator-lead-toast";
import { SidebarClock } from "@/components/sidebar-clock";
import { SidebarShell } from "@/components/sidebar-shell";
import { SpotlightPointer } from "@/components/ui/spotlight-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getTheme } from "@/lib/theme";
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
  const [session, theme] = await Promise.all([auth(), getTheme()]);
  const name = session?.user.name ?? "";
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session!.user.id },
    select: { status: true, notifySound: true, notifyIdleWarning: true },
  });

  return (
    // data-theme aqui, e não no <html>: o servidor já entrega o tema escolhido
    // pintado, sem piscar. bg-app cobre o fundo do body, que fica escuro atrás.
    <div data-theme-root data-theme={theme} className="flex min-h-screen bg-app">
      <SidebarShell>
        {/* No celular a marca já aparece no cabeçalho da gaveta. */}
        <div className="mb-6 hidden justify-center md:flex">
          {/* h-12 e não menos: o "SMFY" é pequeno dentro do lockup, e abaixo
              disso o texto fica ilegível. Ainda sobra folga na sidebar. */}
          <Logo className="h-12" />
        </div>

        <OperatorSidebarNav />

        <div className="mt-4 flex flex-col gap-3">
          <SidebarClock />
          <ThemeToggle />
        </div>

        <OnlineStatusCard
          initialStatus={user.status}
          notifyIdleWarning={user.notifyIdleWarning}
        />

        <div className="mt-auto flex flex-col gap-3">
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
      </SidebarShell>
      {/* pt-20 no celular: o conteúdo começa abaixo do cabeçalho fixo de 56px.
          min-w-0 impede que uma tabela larga estique o flex e empurre a barra. */}
      <main data-glow-scope className="relative min-w-0 flex-1 px-4 pb-8 pt-20 md:px-10 md:py-8">
        <SpotlightPointer />
        <OperatorLeadToast operatorId={session!.user.id} notifySound={user.notifySound} />
        {children}
      </main>
    </div>
  );
}
