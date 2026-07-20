import { redirect } from "next/navigation";

/**
 * As mensagens passaram a morar dentro do produto a que pertencem. Esta rota
 * fica de pé só pra não quebrar link salvo ou aba aberta de quem já usava.
 */
export default function MensagensRedirect() {
  redirect("/atendimento/produtos");
}
