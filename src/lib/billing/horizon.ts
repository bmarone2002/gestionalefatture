import { calculateInvoiceAmount } from "@/lib/billing/amounts";
import { getCurrentPeriod, getNextPeriod, type BillingPeriod } from "@/lib/billing/periods";
import type { BillingFrequency, InvoiceStatus } from "@/lib/domain/enums";
import type { CalendarDate } from "@/lib/dates/calendar-date";
import { addCalendarMonths, maxCalendarDate, todayRome } from "@/lib/dates/calendar-date";
import { money, type MoneyValue } from "@/lib/money";

export const INVOICE_HORIZON_MONTHS = 24;

export type PlannedInvoice = {
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  scheduledDate: CalendarDate;
  periodLabel: string;
  billingFrequency: BillingFrequency;
  boxQuantity: number;
  monthlyPricePerBox: string;
  months: 3 | 6 | 12;
  amount: string;
  status: InvoiceStatus;
};

export type ClientInvoicePlan = {
  first: PlannedInvoice;
  upcoming: PlannedInvoice[];
  all: PlannedInvoice[];
  nextScheduledDate: CalendarDate | null;
};

export function horizonEndDate(
  fromDate: CalendarDate = todayRome(),
  months = INVOICE_HORIZON_MONTHS,
): CalendarDate {
  return addCalendarMonths(fromDate, months);
}

export function planClientInvoices(input: {
  registrationDate: CalendarDate;
  frequency: BillingFrequency;
  boxQuantity: number;
  monthlyPricePerBox: MoneyValue;
  horizonEnd?: CalendarDate;
  today?: CalendarDate;
}): ClientInvoicePlan {
  const today = input.today ?? todayRome();
  const horizonEnd =
    input.horizonEnd ?? horizonEndDate(maxCalendarDate(today, input.registrationDate));
  const firstPeriod = getCurrentPeriod(input.registrationDate, input.frequency);
  const first = toPlannedInvoice({
    period: firstPeriod,
    boxQuantity: input.boxQuantity,
    monthlyPricePerBox: input.monthlyPricePerBox,
    status: "ISSUED",
  });

  const upcoming: PlannedInvoice[] = [];
  let period = getNextPeriod(firstPeriod);
  let guard = 0;
  while (period.scheduledDate <= horizonEnd && guard < 40) {
    upcoming.push(
      toPlannedInvoice({
        period,
        boxQuantity: input.boxQuantity,
        monthlyPricePerBox: input.monthlyPricePerBox,
        status: "TO_ISSUE",
      }),
    );
    period = getNextPeriod(period);
    guard += 1;
  }

  return {
    first,
    upcoming,
    all: [first, ...upcoming],
    nextScheduledDate: upcoming[0]?.scheduledDate ?? null,
  };
}

export function planFutureInvoicesFrom(input: {
  afterPeriod: BillingPeriod;
  frequency: BillingFrequency;
  boxQuantity: number;
  monthlyPricePerBox: MoneyValue;
  horizonEnd: CalendarDate;
}): PlannedInvoice[] {
  const upcoming: PlannedInvoice[] = [];
  let period = getNextPeriod({ ...input.afterPeriod, frequency: input.frequency });
  let guard = 0;
  while (period.scheduledDate <= input.horizonEnd && guard < 40) {
    upcoming.push(
      toPlannedInvoice({
        period,
        boxQuantity: input.boxQuantity,
        monthlyPricePerBox: input.monthlyPricePerBox,
        status: "TO_ISSUE",
      }),
    );
    period = getNextPeriod(period);
    guard += 1;
  }
  return upcoming;
}

function toPlannedInvoice(input: {
  period: BillingPeriod;
  boxQuantity: number;
  monthlyPricePerBox: MoneyValue;
  status: InvoiceStatus;
}): PlannedInvoice {
  const amount = calculateInvoiceAmount(
    input.boxQuantity,
    input.monthlyPricePerBox,
    input.period.months,
  );
  return {
    periodStart: input.period.start,
    periodEnd: input.period.end,
    scheduledDate: input.period.scheduledDate,
    periodLabel: input.period.label,
    billingFrequency: input.period.frequency,
    boxQuantity: input.boxQuantity,
    monthlyPricePerBox: money(input.monthlyPricePerBox).toFixed(4),
    months: input.period.months,
    amount: amount.toFixed(2),
    status: input.status,
  };
}
