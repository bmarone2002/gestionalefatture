import { monthsForFrequency, type BillingFrequency } from "@/lib/domain/enums";
import {
  formatEUR,
  formatIntegerIT,
  formatUnitPrice,
  money,
  roundEuro,
  type Decimal,
  type MoneyValue,
} from "@/lib/money";

export function calculateInvoiceAmount(
  boxQuantity: number,
  monthlyPricePerBox: MoneyValue,
  months: number,
): Decimal {
  if (!Number.isInteger(boxQuantity) || boxQuantity <= 0) {
    throw new Error("La quantità scatole deve essere un intero maggiore di zero");
  }
  if (months !== 3 && months !== 6 && months !== 12) {
    throw new Error("Il numero di mesi deve essere 3, 6 o 12");
  }
  const price = money(monthlyPricePerBox);
  if (price.isNegative()) {
    throw new Error("Il prezzo mensile non può essere negativo");
  }

  return roundEuro(money(boxQuantity).mul(price).mul(months));
}

export function calculateInvoiceAmountForFrequency(
  boxQuantity: number,
  monthlyPricePerBox: MoneyValue,
  frequency: BillingFrequency,
): Decimal {
  return calculateInvoiceAmount(
    boxQuantity,
    monthlyPricePerBox,
    monthsForFrequency(frequency),
  );
}

export function formatInvoicePreview(
  boxQuantity: number,
  monthlyPricePerBox: MoneyValue,
  frequency: BillingFrequency,
): string {
  const months = monthsForFrequency(frequency);
  const amount = calculateInvoiceAmount(boxQuantity, monthlyPricePerBox, months);
  return `${formatIntegerIT(boxQuantity)} × ${formatUnitPrice(monthlyPricePerBox)} × ${months} mesi = ${formatEUR(amount)}`;
}
