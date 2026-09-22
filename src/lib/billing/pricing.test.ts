import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveEffectivePrice,
  validatePriceSchedule,
} from "@/lib/billing/pricing";

describe("Prezzi con decorrenza", () => {
  const prices = [
    {
      effectiveFrom: "2026-01-01",
      effectiveTo: "2026-06-30",
      unitPrice: "0.50",
    },
    { effectiveFrom: "2026-07-01", unitPrice: "0.55" },
  ] as const;

  it("seleziona il prezzo valido alla data richiesta", () => {
    assert.equal(resolveEffectivePrice(prices, "2026-06-30").unitPrice.toFixed(2), "0.50");
    assert.equal(resolveEffectivePrice(prices, "2026-07-01").unitPrice.toFixed(2), "0.55");
  });

  it("rifiuta sovrapposizioni e date senza prezzo", () => {
    assert.throws(() =>
      validatePriceSchedule([
        { effectiveFrom: "2026-01-01", effectiveTo: "2026-03-31", unitPrice: 1 },
        { effectiveFrom: "2026-03-31", unitPrice: 2 },
      ]),
    );
    assert.throws(() => resolveEffectivePrice(prices, "2025-12-31"));
  });
});
