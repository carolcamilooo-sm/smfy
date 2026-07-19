import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Fatia da distribuição em texto: 7.5 -> "7,5%", 7 -> "7%". Uma casa decimal
 * basta — a divisão automática costuma dar quebrado (100/3 = 33,3%).
 */
export function fmtShare(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")}%`;
}
