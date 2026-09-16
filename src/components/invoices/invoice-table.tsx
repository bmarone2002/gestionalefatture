import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientTypeBadge, InvoiceStatusBadge, UrgencyBadge } from "@/components/status-badges";
import { formatItalianDate } from "@/lib/dates/calendar-date";
import { formatEUR } from "@/lib/money";
import type { ClientType, InvoiceStatus, CommitmentStatus } from "@/lib/domain/enums";
import type { CalendarDate } from "@/lib/dates/calendar-date";
import type { InvoiceUrgency } from "@/lib/invoices/urgency";
import { cn } from "cn";
import { CommitmentStatusBadge } from "@/components/status-badges";

export type InvoiceRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientType: ClientType;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  scheduled: CalendarDate;
  amount: string;
  status: InvoiceStatus;
  urgency: InvoiceUrgency;
  forecast: { status: CommitmentStatus } | null;
};

export function InvoiceTable({
  rows,
  today,
}: {
  rows: InvoiceRow[];
  today: CalendarDate;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        Nessuna fattura da mostrare.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Tipologia</TableHead>
          <TableHead>Periodo</TableHead>
          <TableHead>Scadenza</TableHead>
          <TableHead>Importo</TableHead>
          <TableHead>Stato</TableHead>
          <TableHead>Impegno</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className={cn(row.urgency === "OVERDUE" && "bg-red-50/80 hover:bg-red-50")}
          >
            <TableCell>
              <Link href={`/invoices/${row.id}`} className="font-medium hover:underline">
                {row.clientName}
              </Link>
            </TableCell>
            <TableCell>
              <ClientTypeBadge type={row.clientType} />
            </TableCell>
            <TableCell>
              {formatItalianDate(row.periodStart)} → {formatItalianDate(row.periodEnd)}
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span>{formatItalianDate(row.scheduled)}</span>
                <UrgencyBadge urgency={row.urgency} scheduledDate={row.scheduled} today={today} />
              </div>
            </TableCell>
            <TableCell className="font-medium tabular-nums">{formatEUR(row.amount)}</TableCell>
            <TableCell>
              <InvoiceStatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              {row.forecast ? <CommitmentStatusBadge status={row.forecast.status} /> : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
