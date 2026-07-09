export function fillTemplate(
  content: string,
  vars: { nome: string; produto?: string | null }
): string {
  return content
    .replaceAll("{{nome}}", vars.nome)
    .replaceAll("{{produto}}", vars.produto ?? "");
}
