/**
 * Deixa o documento legível pro cliente: 028.471.346-54 em vez de
 * 02847134654. O banco guarda só os dígitos (é assim que dá pra casar venda
 * com lead), mas numa mensagem de WhatsApp o número cru parece erro.
 *
 * Só formata o que tem cara de CPF ou CNPJ; qualquer outra coisa sai como
 * veio, porque inventar máscara em cima de lixo do gateway seria pior.
 */
export function formatDocument(doc: string | null | undefined): string {
  const digitos = (doc ?? "").replace(/\D/g, "");
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc ?? "";
}

export function fillTemplate(
  content: string,
  vars: { nome: string; produto?: string | null; doc?: string | null }
): string {
  return content
    .replaceAll("{{nome}}", vars.nome)
    .replaceAll("{{produto}}", vars.produto ?? "")
    .replaceAll("{{doc}}", formatDocument(vars.doc));
}
