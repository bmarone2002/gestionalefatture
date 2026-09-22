import {
  assertCalendarDate,
  calendarDate,
  parseCalendarDate,
  type CalendarDate,
} from "@/lib/dates/calendar-date";
import { money, roundEuro, type Decimal, type MoneyValue } from "@/lib/money";

export type StockVariationType = "IN" | "OUT";

export type StockVariationCharge = {
  type: StockVariationType;
  invoiceType: "SUPPLEMENTARY" | "CREDIT_NOTE";
  periodStart: CalendarDate | null;
  periodEnd: CalendarDate;
  months: number;
  boxQuantity: number;
  monthlyUnitPrice: Decimal;
  amount: Decimal;
};

/**
 * Un ingresso addebita anche il mese del movimento.
 * Un'uscita accredita dal mese successivo; l'importo del credito è negativo.
 */
export function calculateStockVariation(input: {
  type: StockVariationType;
  occurredOn: CalendarDate;
  boxQuantity: number;
  monthlyUnitPrice: MoneyValue;
}): StockVariationCharge {
  assertCalendarDate(input.occurredOn);
  if (!Number.isInteger(input.boxQuantity) || input.boxQuantity <= 0) {
    throw new Error("La variazione scatole deve essere un intero positivo");
  }
  const unitPrice = money(input.monthlyUnitPrice);
  if (unitPrice.isNegative()) throw new Error("Il prezzo non può essere negativo");

  const occurred = requiredParts(input.occurredOn);
  const quarterEndMonth = Math.ceil(occurred.month / 3) * 3;
  const firstMonth =
    input.type === "IN" ? occurred.month : occurred.month + 1;
  const months = Math.max(0, quarterEndMonth - firstMonth + 1);
  const periodStart =
    months === 0 ? null : calendarDate(occurred.year, firstMonth, 1);
  const periodEnd = endOfMonth(occurred.year, quarterEndMonth);
  const unsigned = roundEuro(
    money(input.boxQuantity).mul(unitPrice).mul(months),
  );

  return {
    type: input.type,
    invoiceType: input.type === "IN" ? "SUPPLEMENTARY" : "CREDIT_NOTE",
    periodStart,
    periodEnd,
    months,
    boxQuantity: input.boxQuantity,
    monthlyUnitPrice: unitPrice,
    amount: input.type === "OUT" ? unsigned.negated() : unsigned,
  };
}

function requiredParts(date: CalendarDate): { year: number; month: number; day: number } {
  const parsed = parseCalendarDate(date);
  if (!parsed) throw new Error(`Data non valida: ${date}`);
  return parsed;
}

function endOfMonth(year: number, month: number): CalendarDate {
  return calendarDate(
    year,
    month,
    new Date(Date.UTC(year, month, 0)).getUTCDate(),
  );
}
