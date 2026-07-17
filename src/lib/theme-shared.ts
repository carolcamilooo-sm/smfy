/**
 * Neutro de propósito: sem "use client" e sem next/headers, pra que o botão
 * (client) e o layout (server) compartilhem a MESMA string.
 *
 * Não mova isto pro theme-toggle.tsx: quando um Server Component importa algo
 * de um arquivo "use client", o export chega como referência de função, não
 * como o valor — e o cookie passaria a ser procurado por "[Function]".
 */
export const THEME_COOKIE = "smfy-theme";

export type Theme = "dark" | "light";
