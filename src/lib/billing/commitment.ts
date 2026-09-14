import { getNextPeriod, type BillingPeriod } from "@/lib/billing/periods";
import type { BillingFrequency, CommitmentStatus } from "@/lib/domain/enums";
import { money, type Decimal, type MoneyValue } from "@/lib/money";
import type { CalendarDate } from "@/lib/dates/calendar-date";

export class InsufficientCommitmentError extends Error {
  readonly code = "INSUFFICIENT_COMMITMENT" as const;
  readonly remaining: Decimal;
  readonly invoiceAmount: Decimal;
  readonly difference: Decimal;

  constructor(remaining: MoneyValue, invoiceAmount: MoneyValue) {
    const remainingMoney = money(remaining);
    const invoiceMoney = money(invoiceAmount);
    super("Impegno residuo insufficiente");
    this.name = "InsufficientCommitmentError";
    this.remaining = remainingMoney;
    this.invoiceAmount = invoiceMoney;
    this.difference = remainingMoney.minus(invoiceMoney);
  }
}

export type CommitmentForecast = {
  initial: Decimal;
  used: Decimal;
  remaining: Decimal;
  usedPercent: number;
  nextInvoiceAmount: Decimal;
  fundableInvoiceCount: number;
  exhaustionDate: CalendarDate | null;
  status: CommitmentStatus;
  canIssueNext: boolean;
};

export function usedCommitment(issuedAmounts: MoneyValue[]): Decimal {
  let total = money(0);
  for (const amount of issuedAmounts) {
    total = total.plus(money(amount));
  }
  return total;
}

export function remainingCommitment(
  commitmentAmount: MoneyValue,
  issuedTotal: MoneyValue,
): Decimal {
  return money(commitmentAmount).minus(money(issuedTotal));
}

export function canIssueAgainstCommitment(
  remaining: MoneyValue,
  invoiceAmount: MoneyValue,
): boolean {
  return money(remaining).gte(money(invoiceAmount));
}

export function assertCanIssueAgainstCommitment(
  remaining: MoneyValue,
  invoiceAmount: MoneyValue,
): void {
  if (!canIssueAgainstCommitment(remaining, invoiceAmount)) {
    throw new InsufficientCommitmentError(remaining, invoiceAmount);
  }
}

export function forecastCommitment(input: {
  commitmentAmount: MoneyValue;
  issuedTotal: MoneyValue;
  nextInvoiceAmount: MoneyValue;
  nextPeriod: BillingPeriod | null;
  frequency: BillingFrequency;
}): CommitmentForecast {
  const initial = money(input.commitmentAmount);
  const used = money(input.issuedTotal);
  const remaining = remainingCommitment(initial, used);
  const nextInvoiceAmount = money(input.nextInvoiceAmount);
  const usedPercent = initial.isZero()
    ? 100
    : Math.min(999, Number(used.div(initial).mul(100).toDecimalPlaces(1).toString()));

  if (nextInvoiceAmount.lte(0)) {
    return {
      initial,
      used,
      remaining,
      usedPercent,
      nextInvoiceAmount,
      fundableInvoiceCount: Number.POSITIVE_INFINITY,
      exhaustionDate: null,
      status: remaining.lt(0) ? "CRITICAL" : "OK",
      canIssueNext: remaining.gte(0),
    };
  }

  const canIssueNext = remaining.gte(nextInvoiceAmount);
  let fundableInvoiceCount = 0;
  let cursor = remaining;
  while (cursor.gte(nextInvoiceAmount) && fundableInvoiceCount < 1000) {
    cursor = cursor.minus(nextInvoiceAmount);
    fundableInvoiceCount += 1;
  }

  let exhaustionDate: CalendarDate | null = null;
  if (input.nextPeriod) {
    let period: BillingPeriod = input.nextPeriod;
    for (let i = 0; i < fundableInvoiceCount; i += 1) {
      period = getNextPeriod(period);
    }
    exhaustionDate = period.scheduledDate;
  }

  let status: CommitmentStatus;
  if (!canIssueNext) {
    status = "CRITICAL";
  } else if (fundableInvoiceCount <= 2) {
    status = "ATTENTION";
  } else {
    status = "OK";
  }

  return {
    initial,
    used,
    remaining,
    usedPercent,
    nextInvoiceAmount,
    fundableInvoiceCount,
    exhaustionDate,
    status,
    canIssueNext,
  };
}
