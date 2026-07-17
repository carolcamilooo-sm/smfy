import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block bg-[length:300%_300%] bg-clip-text font-extrabold tracking-tight text-transparent",
        className
      )}
      style={{
        // As paradas vêm de var pra escurecerem no tema claro — o gradiente
        // original tem quase-branco no meio, que sumia em fundo claro.
        backgroundImage:
          "linear-gradient(135deg, var(--logo-a), var(--logo-b), var(--logo-a))",
        animation: "gradientShift 4s ease-in-out infinite",
      }}
    >
      SMFY
    </span>
  );
}
