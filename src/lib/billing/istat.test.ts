import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyIstatAdjustment } from "@/lib/billing/istat";

describe("Adeguamento ISTAT", () => {
  it("applica la percentuale e arrotonda il prezzo ai centesimi", () => {
    const adjustment = applyIstatAdjustment("0.3333", "5.4");
    assert.equal(adjustment.percentage.toFixed(1), "5.4");
    assert.equal(adjustment.adjustedPrice.toFixed(2), "0.35");
    assert.equal(adjustment.increase.toFixed(2), "0.02");
  });

  it("usa l'arrotondamento commerciale", () => {
    assert.equal(
      applyIstatAdjustment("1.00", "0.5").adjustedPrice.toFixed(2),
      "1.01",
    );
  });
});
