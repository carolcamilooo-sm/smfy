import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "yellow" | "gray" | "blue" | "red";

const toneClasses: Record<Tone, string> = {
  green: "bg-emerald-500/15 text-emerald-400",
  yellow: "bg-amber-500/15 text-amber-400",
  gray: "bg-neutral-500/15 text-neutral-400",
  blue: "bg-sky-500/15 text-sky-400",
  red: "bg-red-500/15 text-red-400",
};

export function Badge({
  tone = "gray",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
