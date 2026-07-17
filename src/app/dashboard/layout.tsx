import { auth } from "@/auth";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/sidebar-nav";
import { SidebarClock } from "@/components/sidebar-clock";
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, theme] = await Promise.all([auth(), getTheme()]);
  const name = session?.user.name ?? "";
  const roleLabel = session?.user.role === "COLLABORATOR" ? "Colaborador" : "Admin";

  return (
    // data-theme aqui, e não no <html>: o servidor já entrega o tema escolhido
    // pintado, sem piscar. bg-app cobre o fundo do body, que fica escuro atrás.
    <div data-theme-root data-theme={theme} className="flex min-h-screen bg-app">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-border bg-app p-4">
        <div className="mb-6 flex justify-center">
          {/* h-12 e não menos: o "SMFY" é pequeno dentro do lockup, e abaixo
              disso o texto fica ilegível. Ainda sobra folga na sidebar. */}
          <Logo className="h-12" />
        </div>

        <SidebarNav />

        <div className="mt-4 flex flex-col gap-3">
          <SidebarClock />
          <ThemeToggle />
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {initials(name) || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">
                {name}
              </p>
              <p className="text-xs text-secondary">{roleLabel}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main data-glow-scope className="flex-1 px-6 py-8">
        <SpotlightPointer />
        {children}
      </main>
    </div>
  );
}
