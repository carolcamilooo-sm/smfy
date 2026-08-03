import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessDashboard } from "@/lib/access";
import { getLeadsForExport, getLeadsByIds } from "@/lib/queries";
import { brDateParts, brHour, brMinute, brDateString } from "@/lib/date-br";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatDate(date: Date) {
  const { year, month, day } = brDateParts(date);
  return `${String(day).padStart(2, "0")} ${MONTHS[month]} ${year} ${String(brHour(date)).padStart(2, "0")}:${String(brMinute(date)).padStart(2, "0")}`;
}

function csvCell(value: string | number | null | undefined) {
  let str = value === null || value === undefined ? "" : String(value);
  // Neutraliza CSV/formula injection: como nome/produto do lead vêm de webhook
  // externo, uma célula começando com = + - @ (ou tab/CR) viraria fórmula ao
  // abrir no Excel/Sheets. Prefixar com ' força o conteúdo a ser tratado texto.
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Força o Excel a tratar o valor como TEXTO, via `="valor"`. Sem isso, número
 * longo como telefone (5511999999999) vira notação científica (5,51999E+12).
 * O valor é escapado dentro das aspas, então continua sendo só texto — nunca
 * uma fórmula executável (e o telefone já sai do webhook como dígitos).
 */
function csvTextCell(value: string | number | null | undefined) {
  const str = value === null || value === undefined ? "" : String(value);
  return `"=""${str.replace(/"/g, '""')}"""`;
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  DECLINED: "Recusado",
  OTHER: "Outro",
};

const SERVICE_LABEL: Record<string, string> = {
  ATTENDED: "Atendido",
  ASSIGNED: "Em andamento",
  WAITING: "Não atendido",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !canAccessDashboard(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const idsParam = params.get("ids");

  const leads = idsParam
    ? await getLeadsByIds(idsParam.split(",").filter(Boolean))
    : await getLeadsForExport({
        q: params.get("q") ?? undefined,
        status: (() => {
          const status = params.get("status");
          return status === "approved" || status === "pending" || status === "declined" || status === "other"
            ? status
            : undefined;
        })(),
        period: params.get("period") ?? undefined,
        from: params.get("from") ?? undefined,
        to: params.get("to") ?? undefined,
        producerId: params.get("producerId") ?? undefined,
        operatorId: params.get("operatorId") ?? undefined,
        limit: Math.min(10000, Math.max(1, Number(params.get("limit")) || 500)),
      });

  const header = [
    "Data",
    "Cliente",
    "Telefone",
    "E-mail",
    "Produto",
    "Produtor",
    "Gateway",
    "Valor",
    "Status pagamento",
    "Status atendimento",
    "Atendente",
    "Mensagem usada",
  ];

  const rows = leads.map((lead) =>
    [
      csvCell(formatDate(lead.createdAt)),
      csvCell(lead.customerName),
      // Telefone como texto: senão o Excel mostra em notação científica.
      csvTextCell(lead.phone),
      csvCell(lead.email ?? ""),
      csvCell(lead.product ?? ""),
      csvCell(lead.producer?.name ?? ""),
      csvCell(lead.gateway),
      // Valor no padrão BR (vírgula decimal), pra o Excel-PT ler como número.
      csvCell(lead.value != null ? lead.value.toFixed(2).replace(".", ",") : ""),
      csvCell(STATUS_LABEL[lead.paymentStatus] ?? lead.paymentStatus),
      csvCell(SERVICE_LABEL[lead.serviceStatus] ?? lead.serviceStatus),
      csvCell(lead.assignedOperator?.name ?? ""),
      csvCell(lead.usedTemplate?.title ?? ""),
    ].join(";")
  );

  // Separador ";" (não ","): o Excel em português usa ponto e vírgula como
  // separador de lista. Com vírgula, ele joga tudo numa coluna só.
  const csv = "﻿" + [header.map(csvCell).join(";"), ...rows].join("\r\n");
  const filename = `leads-${brDateString(new Date())}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
