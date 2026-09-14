import { Prisma } from "@prisma/client";
import type { BillingFrequency } from "@/lib/domain/enums";
import { fromUtcDate, toUtcDate, type CalendarDate } from "@/lib/dates/calendar-date";
import type { PlannedInvoice } from "@/lib/billing/horizon";

export function toPrismaDate(date: CalendarDate): Date {
  return toUtcDate(date);
}

export function fromPrismaDate(date: Date): CalendarDate {
  return fromUtcDate(date);
}

export function decimalString(value: Prisma.Decimal | string | number): string {
  return value.toString();
}

export function plannedInvoiceCreateData(
  clientId: string,
  planned: PlannedInvoice,
  userId: string | null,
  issuedAt?: Date | null,
): Prisma.InvoiceCreateManyInput {
  const isIssued = planned.status === "ISSUED";
  return {
    clientId,
    periodStart: toPrismaDate(planned.periodStart),
    periodEnd: toPrismaDate(planned.periodEnd),
    scheduledDate: toPrismaDate(planned.scheduledDate),
    billingFrequency: planned.billingFrequency as BillingFrequency,
    boxQuantitySnapshot: planned.boxQuantity,
    monthlyPriceSnapshot: planned.monthlyPricePerBox,
    monthsSnapshot: planned.months,
    amount: planned.amount,
    status: planned.status,
    issuedAt: isIssued ? (issuedAt ?? new Date()) : null,
    createdById: userId,
    issuedById: isIssued ? userId : null,
  };
}
