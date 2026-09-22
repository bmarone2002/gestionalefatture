import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizePayments } from "@/lib/billing/payments";

describe("Pagamenti", () => {
  it("calcola totale pagato e saldo residuo", () => {
    const summary = summarizePayments("100.00", ["20.10", "29.90"]);
    assert.equal(summary.totalPaid.toFixed(2), "50.00");
    assert.equal(summary.remaining.toFixed(2), "50.00");
    assert.equal(summary.isPaid, false);
    assert.equal(summary.status, "PARTIALLY_PAID");
  });

  it("considera saldata anche una fattura sovrapagata", () => {
    const summary = summarizePayments("100.00", [60, 45]);
    assert.equal(summary.isPaid, true);
    assert.equal(summary.status, "PAID");
    assert.equal(summary.remaining.toFixed(2), "0.00");
    assert.equal(summary.overpaid.toFixed(2), "5.00");
  });
});
