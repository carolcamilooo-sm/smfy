import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6 text-sm">
            <span className="font-semibold text-neutral-100">
              Leads Recovery
            </span>
            <Link href="/dashboard" className="text-neutral-400 hover:text-neutral-100">
              Dashboard
            </Link>
            <Link
              href="/dashboard/operadores"
              className="text-neutral-400 hover:text-neutral-100"
            >
              Operadores
            </Link>
            <Link
              href="/dashboard/templates"
              className="text-neutral-400 hover:text-neutral-100"
            >
              Mensagens
            </Link>
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
