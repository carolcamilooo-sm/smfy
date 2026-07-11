import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block bg-[length:300%_300%] bg-clip-text font-extrabold tracking-tight text-transparent",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(135deg, oklch(0.78 0.23 300), oklch(0.97 0.01 293), oklch(0.78 0.23 300))",
        animation: "gradientShift 4s ease-in-out infinite",
      }}
    >
      SMFY
    </span>
  );
}
