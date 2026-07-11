import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "green" | "yellow" | "gray" | "blue" | "red";

const toneClasses: Record<Tone, string> = {
  green: "bg-success/15 text-success",
  yellow: "bg-warning/15 text-warning",
  gray: "bg-muted/15 text-muted",
  blue: "bg-accent/15 text-accent",
  red: "bg-danger/15 text-danger",
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
