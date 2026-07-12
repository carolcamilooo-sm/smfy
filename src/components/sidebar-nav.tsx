"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/produtores", label: "Produtores" },
  { href: "/dashboard/operadores", label: "Equipe de Atendimento" },
  { href: "/dashboard/integracoes", label: "Integrações" },
  { href: "/dashboard/ajustes", label: "Ajustes" },
  { href: "/dashboard/historico", label: "Histórico" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const active =
          link.href === "/dashboard"
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
