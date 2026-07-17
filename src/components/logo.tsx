import { cn } from "@/lib/utils";

/**
 * Lockup da marca: hexágono + SMFY, com o gradiente animado atravessando.
 *
 * Não é <img>: o PNG entra como máscara CSS (ver .logo-mark no globals.css) e
 * o que se vê é o gradiente animado recortado pela silhueta da logo. É o que
 * permite a cor correr, como no antigo lockup em texto — a contrapartida é que
 * as cores originais do arquivo não aparecem, só a forma.
 *
 * A altura vem pelo className (h-12, h-14…) e a largura sai do aspect-ratio.
 */
export function Logo({ className }: { className?: string }) {
  return <span role="img" aria-label="SMFY" className={cn("logo-mark", className)} />;
}
