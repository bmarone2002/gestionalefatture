import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateStockVariation } from "@/lib/billing/stock-variations";

describe("Variazioni scatole", () => {
  it("calcola l'integrativa dal mese di ingresso a fine trimestre", () => {
    const result = calculateStockVariation({
      type: "IN",
      occurredOn: "2026-05-20",
      boxQuantity: 20,
      monthlyUnitPrice: "0.50",
    });

    assert.equal(result.periodStart, "2026-05-01");
    assert.equal(result.periodEnd, "2026-06-30");
    assert.equal(result.months, 2);
    assert.equal(result.amount.toFixed(2), "20.00");
    assert.equal(result.invoiceType, "SUPPLEMENTARY");
  });

  it("calcola il credito dal mese successivo a fine trimestre", () => {
    const result = calculateStockVariation({
      type: "OUT",
      occurredOn: "2026-04-02",
      boxQuantity: 20,
      monthlyUnitPrice: "0.50",
    });

    assert.equal(result.periodStart, "2026-05-01");
    assert.equal(result.months, 2);
    assert.equal(result.amount.toFixed(2), "-20.00");
    assert.equal(result.invoiceType, "CREDIT_NOTE");
  });

  it("non genera credito per un'uscita nell'ultimo mese del trimestre", () => {
    const result = calculateStockVariation({
      type: "OUT",
      occurredOn: "2026-06-01",
      boxQuantity: 20,
      monthlyUnitPrice: "0.50",
    });
    assert.equal(result.periodStart, null);
    assert.equal(result.months, 0);
    assert.equal(result.amount.toFixed(2), "0.00");
  });
});
