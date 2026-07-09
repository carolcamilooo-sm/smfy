import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-500",
  secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "bg-transparent text-neutral-300 hover:bg-neutral-800",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(({ className, variant = "primary", ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
