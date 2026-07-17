import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Lockup da marca: hexágono + SMFY. A altura vem pelo className (h-8, h-14…)
 * e a largura acompanha sozinha — o PNG já vem aparado, sem margem em volta.
 *
 * unoptimized porque é um asset local pequeno e fixo: passar pelo otimizador
 * da Vercel a cada tamanho não pagaria a conta.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="SMFY"
      width={700}
      height={411}
      priority
      unoptimized
      className={cn("w-auto object-contain", className)}
    />
  );
}
