import {
  assertCalendarDate,
  type CalendarDate,
} from "@/lib/dates/calendar-date";
import { money, type Decimal, type MoneyValue } from "@/lib/money";

export type EffectivePrice = {
  id?: string;
  effectiveFrom: CalendarDate;
  effectiveTo?: CalendarDate | null;
  unitPrice: MoneyValue;
};

export type ResolvedPrice = {
  id?: string;
  effectiveFrom: CalendarDate;
  effectiveTo: CalendarDate | null;
  unitPrice: Decimal;
};

export function validatePriceSchedule(prices: readonly EffectivePrice[]): void {
  const ordered = [...prices].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );

  for (const [index, price] of ordered.entries()) {
    assertCalendarDate(price.effectiveFrom);
    if (price.effectiveTo) {
      assertCalendarDate(price.effectiveTo);
      if (price.effectiveTo < price.effectiveFrom) {
        throw new Error("La fine decorrenza non può precedere l'inizio");
      }
    }
    if (money(price.unitPrice).isNegative()) {
      throw new Error("Il prezzo non può essere negativo");
    }

    const previous = ordered[index - 1];
    if (
      previous &&
      (!previous.effectiveTo || previous.effectiveTo >= price.effectiveFrom)
    ) {
      throw new Error("Le decorrenze prezzo non possono sovrapporsi");
    }
  }
}

export function resolveEffectivePrice(
  prices: readonly EffectivePrice[],
  onDate: CalendarDate,
): ResolvedPrice {
  assertCalendarDate(onDate);
  validatePriceSchedule(prices);

  const match = prices.find(
    (price) =>
      price.effectiveFrom <= onDate &&
      (!price.effectiveTo || onDate <= price.effectiveTo),
  );
  if (!match) {
    throw new Error(`Nessun prezzo con decorrenza valida al ${onDate}`);
  }

  return {
    id: match.id,
    effectiveFrom: match.effectiveFrom,
    effectiveTo: match.effectiveTo ?? null,
    unitPrice: money(match.unitPrice),
  };
}
