import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateInvoiceAmount,
  calculateInvoiceAmountForFrequency,
  formatInvoicePreview,
} from "@/lib/billing/amounts";
import { formatEUR } from "@/lib/money";

describe("Calcolo importo fattura", () => {
  it("TEST 4 — 500 scatole × €0,50 × 3 mesi = €750,00", () => {
    const amount = calculateInvoiceAmount(500, "0.50", 3);
    assert.equal(amount.toFixed(2), "750.00");
    assert.equal(formatEUR(amount), "€ 750,00");
  });

  it("TEST 5 — 500 scatole × €0,50 × 6 mesi = €1.500,00", () => {
    const amount = calculateInvoiceAmount(500, "0.50", 6);
    assert.equal(amount.toFixed(2), "1500.00");
    assert.equal(formatEUR(amount), "€ 1.500,00");
    assert.equal(
      calculateInvoiceAmountForFrequency(500, "0.50", "SEMIANNUAL").toFixed(2),
      "1500.00",
    );
  });

  it("arrotonda commercialmente a 2 decimali", () => {
    const amount = calculateInvoiceAmount(3, "0.3333", 3);
    assert.equal(amount.toFixed(2), "3.00");
  });

  it("preview in italiano", () => {
    const preview = formatInvoicePreview(1200, "0.35", "QUARTERLY");
    assert.equal(preview, "1.200 × € 0,35 × 3 mesi = € 1.260,00");
  });

  it("rifiuta quantità non positiva", () => {
    assert.throws(() => calculateInvoiceAmount(0, "0.50", 3));
  });
});
