import { cookies } from "next/headers";
import { THEME_COOKIE, type Theme } from "@/lib/theme-shared";

/**
 * Tema escolhido pelo usuário, lido no servidor pra já sair renderizado no
 * HTML — é o que evita a tela piscar escura antes de virar clara.
 *
 * Só use nos layouts do painel: cookies() torna a rota dinâmica, e esses
 * layouts já são (chamam auth()). O login e a landing seguem estáticos, e
 * escuros de propósito.
 */
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  return store.get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
}
