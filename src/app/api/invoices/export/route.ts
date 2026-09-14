import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { listInvoicesForExport } from "@/server/services/invoices";
import { toCsv } from "@/lib/csv";
import { formatItalianDate, formatItalianDateTime } from "@/lib/dates/calendar-date";
import { formatEUR } from "@/lib/money";
import { INVOICE_STATUS_LABELS } from "@/lib/domain/enums";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non autenticato", { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const invoices = await listInvoicesForExport({
    status: searchParams.get("status") ?? undefined,
    range: searchParams.get("range") ?? undefined,
    clientId: searchParams.get("clientId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    frequency: searchParams.get("frequency") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });

  const rows = [
    ["Cliente", "Periodo", "Scadenza", "Importo", "Stato", "Data emissione", "CIG", "Determina"],
    ...invoices.map((invoice) => [
      invoice.client.name,
      `${formatItalianDate(invoice.periodStartDate)} - ${formatItalianDate(invoice.periodEndDate)}`,
      formatItalianDate(invoice.scheduled),
      formatEUR(invoice.amount.toString()),
      INVOICE_STATUS_LABELS[invoice.status],
      invoice.issuedAt ? formatItalianDateTime(invoice.issuedAt) : "",
      invoice.client.cig ?? "",
      invoice.client.determina ?? "",
    ]),
  ];

  const csv = toCsv(rows);
  const filename = `fatture-archivia-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
