import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/produtores", label: "Produtores" },
  { href: "/dashboard/templates", label: "Mensagens" },
  { href: "/dashboard/operadores", label: "Equipe de Atendimento" },
  { href: "/dashboard/integracoes", label: "Integrações" },
  { href: "/dashboard/ajustes", label: "Ajustes" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <nav className="flex flex-wrap items-center gap-5 text-sm">
            <span className="font-semibold text-neutral-100">smfy</span>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-neutral-400 hover:text-neutral-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
