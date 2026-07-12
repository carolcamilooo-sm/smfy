"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/atendimento", label: "Meus leads" },
  { href: "/atendimento/mensagens", label: "Mensagens" },
  { href: "/atendimento/historico", label: "Histórico" },
  { href: "/atendimento/desempenho", label: "Meu desempenho" },
  { href: "/atendimento/ajustes", label: "Ajustes" },
];

export function OperatorSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const active =
          link.href === "/atendimento"
            ? pathname === link.href
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent/15 text-accent"
                : "text-secondary hover:bg-surface-raised hover:text-primary"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
