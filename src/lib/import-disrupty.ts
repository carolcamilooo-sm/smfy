import type { PaymentStatus } from "@/generated/prisma/client";
import { normalizePhone } from "@/lib/phone";

/**
 * Leitor da planilha de vendas da Disrupty.
 *
 * Colunas do export deles: ID, Data, Cliente, Telefone, Valor Bruto (R$),
 * Valor Líquido (R$), Status, Método de Pagamento, Parcelas, Últimos 4 Dígitos.
 *
 * O que a planilha NÃO traz, e o webhook traz: e-mail, CPF e nome do produto.
 * Lead importado nasce sem esses campos — por isso o produto é escolhido na
 * hora de importar, e {{doc}} sai vazio numa mensagem desses leads.
 */

/** Os mesmos status que o webhook da Disrupty já entende. */
const STATUS_MAP: Record<string, PaymentStatus> = {
  PAGO: "APPROVED",
  PENDENTE: "PENDING",
  EM_PROCESSAMENTO: "PENDING",
  "EM PROCESSAMENTO": "PENDING",
  RECUSADO: "DECLINED",
  CANCELADO: "DECLINED",
  FALHA: "DECLINED",
  ESTORNO: "OTHER",
  REEMBOLSADO: "OTHER",
};

export type LinhaImportada = {
  externalId: string;
  customerName: string;
  phone: string;
  document: string | null;
  email: string | null;
  value: number | null;
  paymentStatus: PaymentStatus;
  createdAt: Date;
};

export type LinhaComProblema = { linha: number; motivo: string; conteudo: string };

export type LeituraPlanilha = {
  validas: LinhaImportada[];
  problemas: LinhaComProblema[];
  colunasEncontradas: string[];
};

/**
 * CSV de verdade: campo entre aspas pode conter o separador e quebra de linha,
 * e "" dentro das aspas é uma aspa literal. Um split(",") ingênuo quebraria na
 * primeira linha com vírgula dentro do campo.
 */
function parseCSV(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let atual: string[] = [];
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') dentroDeAspas = true;
    else if (c === sep) {
      atual.push(campo);
      campo = "";
    } else if (c === "\n") {
      atual.push(campo);
      linhas.push(atual);
      atual = [];
      campo = "";
    } else if (c !== "\r") {
      campo += c;
    }
  }

  if (campo || atual.length) {
    atual.push(campo);
    linhas.push(atual);
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

/**
 * Planilha brasileira costuma vir com ponto e vírgula, justamente porque a
 * vírgula é o separador decimal (64,63). Mas nem sempre — então decide pelo
 * que aparece mais no cabeçalho.
 */
function detectarSeparador(primeiraLinha: string): string {
  const pontoEVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const virgula = (primeiraLinha.match(/,/g) ?? []).length;
  return pontoEVirgula >= virgula ? ";" : ",";
}

/** Tira acento e caixa pra achar a coluna mesmo se o export mudar de estilo. */
function normalizarCabecalho(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** "64,63" e "1.234,56" viram número; "N/A" e vazio viram nulo. */
function lerValor(bruto: string): number | null {
  const limpo = bruto.trim();
  if (!limpo || /^n\/?a$/i.test(limpo)) return null;
  const n = Number(limpo.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Guarda o documento só se tiver cara de CPF (11 dígitos) ou CNPJ (14). O
 * campo costuma vir com lixo — já existe lead gravado com "00000000000" — e
 * lixo aqui não é inofensivo: apareceria na mensagem enviada ao cliente pelo
 * {{doc}}, e poderia casar uma venda com a pessoa errada.
 */
function lerDocumento(bruto: string): string | null {
  const digitos = (bruto ?? "").replace(/\D/g, "");
  if (digitos.length !== 11 && digitos.length !== 14) return null;
  if (/^(\d)\1+$/.test(digitos)) return null;
  return digitos;
}

function lerEmail(bruto: string): string | null {
  const limpo = (bruto ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo) ? limpo : null;
}

/** "20/07/2026" -> Date no início daquele dia em Brasília (UTC-3). */
function lerData(bruto: string): Date | null {
  const m = bruto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const d = new Date(`${ano}-${mes}-${dia}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 3 * 60 * 60 * 1000);
}

export function lerPlanilhaDisrupty(texto: string): LeituraPlanilha {
  const primeira = texto.split("\n")[0] ?? "";
  const linhas = parseCSV(texto, detectarSeparador(primeira));

  if (linhas.length === 0) {
    return { validas: [], problemas: [], colunasEncontradas: [] };
  }

  const cabecalho = linhas[0].map((c) => normalizarCabecalho(c));
  const col = (...nomes: string[]) => {
    for (const n of nomes) {
      const i = cabecalho.indexOf(normalizarCabecalho(n));
      if (i !== -1) return i;
    }
    return -1;
  };

  const iId = col("ID");
  const iData = col("Data");
  const iCliente = col("Cliente");
  const iTelefone = col("Telefone");
  const iValor = col("Valor Bruto (R$)", "Valor Bruto", "Valor");
  const iStatus = col("Status");
  // Opcionais: o export padrão não traz, mas se a planilha tiver, aproveita.
  // Vários nomes porque cada export chama de um jeito.
  const iDoc = col("CPF", "CPF/CNPJ", "Documento", "Doc", "CPF do Cliente");
  const iEmail = col("E-mail", "Email", "E-mail do Cliente");

  const validas: LinhaImportada[] = [];
  const problemas: LinhaComProblema[] = [];
  const vistos = new Set<string>();

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    const n = i + 1;
    const resumo = linha.slice(0, 4).join(" | ").slice(0, 70);

    const externalId = (iId >= 0 ? linha[iId] : "")?.trim() ?? "";
    if (!externalId) {
      problemas.push({ linha: n, motivo: "sem ID da transação", conteudo: resumo });
      continue;
    }

    const telefone = normalizePhone((iTelefone >= 0 ? linha[iTelefone] : "") ?? "");
    // Sem telefone não há atendimento possível: o lead entraria só pra encher fila.
    if (telefone.length < 12) {
      problemas.push({ linha: n, motivo: "telefone inválido ou vazio", conteudo: resumo });
      continue;
    }

    const statusBruto = ((iStatus >= 0 ? linha[iStatus] : "") ?? "").trim().toUpperCase();
    const paymentStatus = STATUS_MAP[statusBruto];
    // Status desconhecido não vira "outro" caladamente: seria classificar
    // errado uma venda, e ninguém perceberia.
    if (!paymentStatus) {
      problemas.push({ linha: n, motivo: `status desconhecido: "${statusBruto}"`, conteudo: resumo });
      continue;
    }

    // Planilha pode repetir a mesma venda; fica a primeira ocorrência.
    if (vistos.has(externalId)) {
      problemas.push({ linha: n, motivo: "repetida dentro da própria planilha", conteudo: resumo });
      continue;
    }
    vistos.add(externalId);

    validas.push({
      externalId,
      customerName: ((iCliente >= 0 ? linha[iCliente] : "") ?? "").trim() || "Sem nome",
      phone: telefone,
      document: iDoc >= 0 ? lerDocumento(linha[iDoc] ?? "") : null,
      email: iEmail >= 0 ? lerEmail(linha[iEmail] ?? "") : null,
      value: iValor >= 0 ? lerValor(linha[iValor] ?? "") : null,
      paymentStatus,
      // Sem data legível, usa agora — melhor que recusar a linha inteira.
      createdAt: (iData >= 0 ? lerData(linha[iData] ?? "") : null) ?? new Date(),
    });
  }

  return { validas, problemas, colunasEncontradas: linhas[0].map((c) => c.trim()) };
}
