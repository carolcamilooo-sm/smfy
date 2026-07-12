import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLeadsForExport } from "@/lib/queries";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function csvCell(value: string | number | null | undefined) {
  const str = value === null || value === undefined ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  DECLINED: "Carrinho",
  OTHER: "Outro",
};

const SERVICE_LABEL: Record<string, string> = {
  ATTENDED: "Atendido",
  ASSIGNED: "Em andamento",
  WAITING: "Não atendido",
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const limit = Math.min(10000, Math.max(1, Number(params.get("limit")) || 500));

  const leads = await getLeadsForExport({
    q: params.get("q") ?? undefined,
    status:
      status === "attended" || status === "assigned" || status === "waiting" ? status : undefined,
    period: params.get("period") ?? undefined,
    producerId: params.get("producerId") ?? undefined,
    limit,
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
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
