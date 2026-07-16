import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      // data-card marca o alvo do spotlight; ele só acende dentro de um
      // [data-glow-scope] (hoje, os dashboards) — ver globals.css.
      data-card=""
      className={cn(
        "rounded-xl border border-border bg-surface p-4",
        className
      )}
      {...props}
    />
  );
}
