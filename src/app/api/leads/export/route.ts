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
  const str = value === null || value === undefined ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
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
        producerId: params.get("producerId") ?? undefined,
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
      formatDate(lead.createdAt),
      lead.customerName,
      lead.phone,
      lead.email ?? "",
      lead.product ?? "",
      lead.producer?.name ?? "",
      lead.gateway,
      lead.value ?? "",
      STATUS_LABEL[lead.paymentStatus] ?? lead.paymentStatus,
      SERVICE_LABEL[lead.serviceStatus] ?? lead.serviceStatus,
      lead.assignedOperator?.name ?? "",
      lead.usedTemplate?.title ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");
  const filename = `leads-${brDateString(new Date())}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
