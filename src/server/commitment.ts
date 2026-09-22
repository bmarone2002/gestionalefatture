import type { Client, Invoice } from "@prisma/client";
import {
  assertCanIssueAgainstCommitment,
  forecastCommitment,
  remainingCommitment,
  usedCommitment,
  type CommitmentForecast,
} from "@/lib/billing/commitment";
import { calculateInvoiceAmountForFrequency } from "@/lib/billing/amounts";
import { getCurrentPeriod, getNextPeriod, type BillingPeriod } from "@/lib/billing/periods";
import { fromPrismaDate } from "@/server/mappers";
import type { CalendarDate } from "@/lib/dates/calendar-date";

export function municipalityForecast(
  client: Client,
  invoices: Invoice[],
): CommitmentForecast | null {
  if (client.type !== "MUNICIPALITY" || client.commitmentAmount == null) {
    return null;
  }

  const issued = invoices.filter(
    (invoice) => invoice.status === "ISSUED" || invoice.status === "PAID",
  );
  const used = usedCommitment(issued.map((invoice) => invoice.amount.toString()));
  const upcoming = invoices
    .filter((invoice) => invoice.status === "TO_ISSUE")
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  const nextInvoice = upcoming[0];

  const nextInvoiceAmount = nextInvoice
    ? nextInvoice.amount.toString()
    : calculateInvoiceAmountForFrequency(
        client.boxQuantity,
        client.monthlyPricePerBox.toString(),
        client.billingFrequency,
      );

  const nextPeriod = nextInvoice
    ? periodFromInvoice(nextInvoice)
    : nextPeriodAfterInvoices(client, invoices);

  return forecastCommitment({
    commitmentAmount: client.commitmentAmount.toString(),
    issuedTotal: used,
    nextInvoiceAmount,
    nextPeriod,
    frequency: client.billingFrequency,
  });
}

export function remainingForClient(client: Client, invoices: Invoice[]) {
  if (client.type !== "MUNICIPALITY" || client.commitmentAmount == null) {
    return null;
  }
  const used = usedCommitment(
    invoices
      .filter((invoice) => invoice.status === "ISSUED" || invoice.status === "PAID")
      .map((invoice) => invoice.amount.toString()),
  );
  return remainingCommitment(client.commitmentAmount.toString(), used);
}

export function assertMunicipalityCanIssue(client: Client, invoices: Invoice[], amount: string) {
  const remaining = remainingForClient(client, invoices);
  if (remaining == null) {
    return;
  }
  assertCanIssueAgainstCommitment(remaining, amount);
}

function periodFromInvoice(invoice: Invoice): BillingPeriod {
  return {
    start: fromPrismaDate(invoice.periodStart),
    end: fromPrismaDate(invoice.periodEnd),
    scheduledDate: fromPrismaDate(invoice.scheduledDate),
    months: invoice.monthsSnapshot === 12 ? 12 : invoice.monthsSnapshot === 6 ? 6 : 3,
    frequency: invoice.billingFrequency,
    label: "",
  };
}

function nextPeriodAfterInvoices(client: Client, invoices: Invoice[]): BillingPeriod | null {
  if (invoices.length === 0) {
    return getCurrentPeriod(fromPrismaDate(client.registrationDate), client.billingFrequency);
  }
  const last = [...invoices].sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime()).at(-1);
  if (!last) {
    return null;
  }
  return getNextPeriod(periodFromInvoice(last));
}

export function invoicePeriodLabel(start: CalendarDate, end: CalendarDate): string {
  return `${start} → ${end}`;
}
