import { resolveEffectivePrice, type EffectivePrice } from "@/lib/billing/pricing";
import {
  assertCalendarDate,
  calendarDate,
  parseCalendarDate,
  type CalendarDate,
} from "@/lib/dates/calendar-date";
import { money, roundEuro, type Decimal } from "@/lib/money";

export type QuarterlyStorageCharge = {
  kind: "STORAGE";
  contractId: string;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  scheduledDate: CalendarDate;
  months: number;
  boxQuantity: number;
  monthlyUnitPrice: Decimal;
  amount: Decimal;
  isInitialFraction: boolean;
};

export function buildQuarterlyStorageCalendar(input: {
  contractId: string;
  startsOn: CalendarDate;
  through: CalendarDate;
  boxQuantity: number;
  prices: readonly EffectivePrice[];
}): QuarterlyStorageCharge[] {
  assertCalendarDate(input.startsOn);
  assertCalendarDate(input.through);
  if (!input.contractId) throw new Error("contractId obbligatorio");
  if (!Number.isInteger(input.boxQuantity) || input.boxQuantity <= 0) {
    throw new Error("La quantità scatole deve essere un intero positivo");
  }
  if (input.through < input.startsOn) return [];

  const start = requiredParts(input.startsOn);
  let periodStart = calendarDate(start.year, start.month, 1);
  let initial = true;
  const charges: QuarterlyStorageCharge[] = [];

  while (periodStart <= input.through) {
    const parts = requiredParts(periodStart);
    const quarterEndMonth = Math.ceil(parts.month / 3) * 3;
    const periodEnd = endOfMonth(parts.year, quarterEndMonth);
    const months = quarterEndMonth - parts.month + 1;
    const scheduledDate = initial ? input.startsOn : periodStart;
    const price = resolveEffectivePrice(input.prices, scheduledDate).unitPrice;

    charges.push({
      kind: "STORAGE",
      contractId: input.contractId,
      periodStart,
      periodEnd,
      scheduledDate,
      months,
      boxQuantity: input.boxQuantity,
      monthlyUnitPrice: price,
      amount: roundEuro(money(input.boxQuantity).mul(price).mul(months)),
      isInitialFraction: initial,
    });

    periodStart = nextMonth(parts.year, quarterEndMonth);
    initial = false;
  }

  return charges;
}

function requiredParts(date: CalendarDate): { year: number; month: number; day: number } {
  const parsed = parseCalendarDate(date);
  if (!parsed) throw new Error(`Data non valida: ${date}`);
  return parsed;
}

function nextMonth(year: number, month: number): CalendarDate {
  return month === 12
    ? calendarDate(year + 1, 1, 1)
    : calendarDate(year, month + 1, 1);
}

function endOfMonth(year: number, month: number): CalendarDate {
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return calendarDate(year, month, day);
}
