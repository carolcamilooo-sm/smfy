import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import type { Prisma } from "@/generated/prisma/client";

/**
 * De quem é esta venda.
 *
 * O gateway da empresa não sabe quem atendeu — ele só conhece o comprador. O
 * dono sai de procurar esse comprador entre os leads já distribuídos.
 *
 * Ordem das chaves: CPF, telefone, e-mail. CPF primeiro porque não muda e não
 * tem variação de formato; o telefone vem normalizado (55 + DDD + número) tanto
 * na entrada do lead quanto aqui, então compara igual.
 *
 * Sem corte de tempo: o cliente pode guardar o link de pagamento e pagar vinte
 * dias depois, e essa venda é de quem trabalhou o lead. Havendo mais de um
 * atendimento pra mesma pessoa, ganha o MAIS RECENTE anterior à venda — o
 * trabalho mais fresco é o que converteu.
 */
export type SaleMatch = {
  leadId: string;
  operatorId: string;
  /** Quando o lead foi entregue ao atendente; serve pra medir o tempo até pagar. */
  assignedAt: Date | null;
};

/**
 * CPF só serve de chave se for um CPF de verdade.
 *
 * Os gateways deixam passar lixo nesse campo: há lead gravado com
 * "00000000000", e um CNPJ de preenchimento que se repete em 18 leads. Casar
 * por um documento desses creditaria a venda a quem por acaso atendeu o último
 * lead com aquele lixo — dinheiro e reconhecimento indo pra pessoa errada.
 *
 * Os dígitos verificadores derrubam isso sem precisar de lista de exceção. Não
 * sendo válido, a busca cai pro telefone, que está em 100% dos leads.
 */
export function cpfValido(digitos: string): boolean {
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const calcula = (ate: number) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(digitos[i]) * (ate + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcula(9) === Number(digitos[9]) && calcula(10) === Number(digitos[10]);
}

export async function matchSaleToLead(buyer: {
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Momento da venda; só atendimentos anteriores a ela concorrem. */
  paidAt?: Date;
}): Promise<SaleMatch | null> {
  const paidAt = buyer.paidAt ?? new Date();

  // Cada tentativa é uma chave diferente, da mais confiável pra menos. A
  // primeira que casar decide — não faz sentido cruzar as três.
  const tentativas: Prisma.LeadWhereInput[] = [];

  const documento = buyer.document?.replace(/\D/g, "") ?? "";
  if (cpfValido(documento)) tentativas.push({ document: documento });

  const telefone = buyer.phone ? normalizePhone(buyer.phone) : "";
  if (telefone) tentativas.push({ phone: telefone });

  const email = buyer.email?.trim().toLowerCase();
  if (email) tentativas.push({ email: { equals: email, mode: "insensitive" } });

  for (const chave of tentativas) {
    const lead = await prisma.lead.findFirst({
      where: {
        ...chave,
        assignedOperatorId: { not: null },
        // Só atendimentos que já tinham acontecido quando a venda entrou.
        assignedAt: { lte: paidAt },
      },
      orderBy: { assignedAt: "desc" },
      select: { id: true, assignedOperatorId: true, assignedAt: true },
    });
    if (lead?.assignedOperatorId) {
      return {
        leadId: lead.id,
        operatorId: lead.assignedOperatorId,
        assignedAt: lead.assignedAt,
      };
    }
  }

  return null;
}
