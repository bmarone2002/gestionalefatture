import Decimal from "decimal.js";

Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export { Decimal };

export type MoneyValue = Decimal.Value;

export function money(value: MoneyValue): Decimal {
  return new Decimal(value);
}

export function roundEuro(value: MoneyValue): Decimal {
  return money(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function roundUnitPrice(value: MoneyValue): Decimal {
  return money(value).toDecimalPlaces(4, Decimal.ROUND_HALF_UP);
}

/**
 * Accetta 0,50 / 0.50 / 1.250,00 / 15.000 / 1250.
 */
export function parseItalianDecimal(raw: string): Decimal {
  const cleaned = raw.trim().replace(/\s/g, "").replace(/€/g, "");
  if (!cleaned) {
    throw new Error("Importo mancante");
  }
  const negative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/^-/, "");
  let normalized: string;

  if (unsigned.includes(",") && unsigned.includes(".")) {
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  } else if (unsigned.includes(",")) {
    normalized = unsigned.replace(",", ".");
  } else if (unsigned.includes(".")) {
    const parts = unsigned.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (parts.length > 2 || last.length === 3) {
      normalized = unsigned.replace(/\./g, "");
    } else {
      normalized = unsigned;
    }
  } else {
    normalized = unsigned;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Importo non valido: ${raw}`);
  }
  return money(`${negative ? "-" : ""}${normalized}`);
}

export function formatIntegerIT(value: number): string {
  const negative = value < 0;
  const whole = Math.abs(Math.trunc(value)).toString();
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${grouped}`;
}

/** Formato richiesto: € 1.250,00 */
export function formatEUR(value: MoneyValue): string {
  const decimal = roundEuro(value);
  const negative = decimal.isNegative() && !decimal.isZero();
  const abs = decimal.abs().toFixed(2);
  const [whole, fraction = "00"] = abs.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}€ ${grouped},${fraction}`;
}

export function formatUnitPrice(value: MoneyValue): string {
  const decimal = roundUnitPrice(value);
  const asNumber = decimal.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  const [whole, fraction = ""] = asNumber.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimals = fraction.length <= 2 ? decimal.toFixed(2).split(".")[1] : fraction;
  return `€ ${grouped},${decimals}`;
}
