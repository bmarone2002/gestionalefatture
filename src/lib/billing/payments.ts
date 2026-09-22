import { money, roundEuro, type Decimal, type MoneyValue } from "@/lib/money";

export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export type PaymentSummary = {
  invoiceTotal: Decimal;
  totalPaid: Decimal;
  remaining: Decimal;
  overpaid: Decimal;
  isPaid: boolean;
  status: PaymentStatus;
};

export function summarizePayments(
  invoiceTotalValue: MoneyValue,
  payments: readonly MoneyValue[],
): PaymentSummary {
  const invoiceTotal = roundEuro(invoiceTotalValue);
  if (invoiceTotal.isNegative()) {
    throw new Error("Il totale documento non può essere negativo");
  }

  const totalPaid = roundEuro(
    payments.reduce<Decimal>((total, payment) => {
      const value = money(payment);
      if (value.isNegative()) {
        throw new Error("Un pagamento non può essere negativo");
      }
      return total.plus(value);
    }, money(0)),
  );
  const difference = invoiceTotal.minus(totalPaid);
  const isPaid = totalPaid.greaterThanOrEqualTo(invoiceTotal);

  return {
    invoiceTotal,
    totalPaid,
    remaining: roundEuro(maxDecimal(difference, money(0))),
    overpaid: roundEuro(maxDecimal(difference.negated(), money(0))),
    isPaid,
    status: isPaid
      ? "PAID"
      : totalPaid.isZero()
        ? "UNPAID"
        : "PARTIALLY_PAID",
  };
}

function maxDecimal(a: Decimal, b: Decimal): Decimal {
  return a.greaterThan(b) ? a : b;
}
