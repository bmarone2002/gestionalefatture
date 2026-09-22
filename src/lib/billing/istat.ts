import {
  money,
  roundEuro,
  type Decimal,
  type MoneyValue,
} from "@/lib/money";

export type IstatAdjustment = {
  previousPrice: Decimal;
  percentage: Decimal;
  increase: Decimal;
  adjustedPrice: Decimal;
};

/**
 * La percentuale è espressa in punti percentuali (es. 5,4 significa 5,4%).
 * Il nuovo prezzo unitario viene arrotondato commercialmente ai centesimi.
 */
export function applyIstatAdjustment(
  currentPriceValue: MoneyValue,
  percentageValue: MoneyValue,
): IstatAdjustment {
  const previousPrice = money(currentPriceValue);
  const percentage = money(percentageValue);
  if (previousPrice.isNegative()) throw new Error("Il prezzo non può essere negativo");
  if (percentage.lessThan(-100)) {
    throw new Error("La percentuale ISTAT non può essere inferiore a -100%");
  }

  const adjustedPrice = roundEuro(
    previousPrice.mul(money(1).plus(percentage.div(100))),
  );

  return {
    previousPrice,
    percentage,
    increase: roundEuro(adjustedPrice.minus(previousPrice)),
    adjustedPrice,
  };
}
