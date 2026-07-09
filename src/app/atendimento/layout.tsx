import { SignOutButton } from "@/components/sign-out-button";

export default function AtendimentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="font-semibold text-neutral-100">
            Leads Recovery — Atendimento
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
