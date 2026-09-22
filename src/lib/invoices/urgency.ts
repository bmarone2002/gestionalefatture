import type { InvoiceStatus } from "@/lib/domain/enums";
import {
  compareCalendarDates,
  diffCalendarDays,
  type CalendarDate,
} from "@/lib/dates/calendar-date";

export type InvoiceUrgency = "OVERDUE" | "TODAY" | "WEEK" | "MONTH" | "LATER" | "ISSUED";

export function invoiceUrgency(
  status: InvoiceStatus,
  scheduledDate: CalendarDate,
  today: CalendarDate,
): InvoiceUrgency {
  if (status !== "TO_ISSUE") {
    return "ISSUED";
  }
  const cmp = compareCalendarDates(scheduledDate, today);
  if (cmp < 0) return "OVERDUE";
  if (cmp === 0) return "TODAY";
  const days = diffCalendarDays(today, scheduledDate);
  if (days <= 7) return "WEEK";
  if (days <= 30) return "MONTH";
  return "LATER";
}

export function overdueBadgeLabel(scheduledDate: CalendarDate, today: CalendarDate): string {
  const days = diffCalendarDays(scheduledDate, today);
  if (days <= 0) {
    return "SCADUTA OGGI";
  }
  if (days === 1) {
    return "SCADUTA DA 1 GIORNO";
  }
  return `SCADUTA DA ${days} GIORNI`;
}
