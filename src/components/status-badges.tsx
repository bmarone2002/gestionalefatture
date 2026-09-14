"use client";

import { Badge } from "@/components/ui/badge";
import {
  CLIENT_TYPE_LABELS,
  COMMITMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  type ClientType,
  type CommitmentStatus,
  type InvoiceStatus,
} from "@/lib/domain/enums";
import { overdueBadgeLabel } from "@/lib/invoices/urgency";
import type { CalendarDate } from "@/lib/dates/calendar-date";
import type { InvoiceUrgency } from "@/lib/invoices/urgency";
import { cn } from "cn";

export function ClientTypeBadge({ type }: { type: ClientType }) {
  return (
    <Badge variant={type === "MUNICIPALITY" ? "secondary" : "outline"}>
      {CLIENT_TYPE_LABELS[type]}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant={status === "ISSUED" ? "secondary" : "outline"}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}

export function OverdueBadge({
  scheduledDate,
  today,
}: {
  scheduledDate: CalendarDate;
  today: CalendarDate;
}) {
  return (
    <Badge className="rounded-md bg-red-600 text-white hover:bg-red-600">
      {overdueBadgeLabel(scheduledDate, today)}
    </Badge>
  );
}

export function CommitmentStatusBadge({ status }: { status: CommitmentStatus }) {
  return (
    <Badge
      className={cn(
        "rounded-md",
        status === "OK" && "bg-emerald-700 text-white",
        status === "ATTENTION" && "bg-amber-600 text-white",
        status === "CRITICAL" && "bg-red-600 text-white",
      )}
    >
      {COMMITMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function UrgencyBadge({ urgency, scheduledDate, today }: {
  urgency: InvoiceUrgency;
  scheduledDate: CalendarDate;
  today: CalendarDate;
}) {
  if (urgency === "OVERDUE") {
    return <OverdueBadge scheduledDate={scheduledDate} today={today} />;
  }
  if (urgency === "TODAY") {
    return <Badge className="rounded-md bg-red-700 text-white">DA EMETTERE OGGI</Badge>;
  }
  if (urgency === "WEEK") {
    return <Badge className="rounded-md bg-amber-600 text-white">PROSSIMI 7 GIORNI</Badge>;
  }
  return null;
}
