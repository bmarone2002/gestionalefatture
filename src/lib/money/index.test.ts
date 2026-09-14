import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEUR, parseItalianDecimal } from "@/lib/money";

describe("Denaro", () => {
  it("parsa formati italiani", () => {
    assert.equal(parseItalianDecimal("0,50").toFixed(2), "0.50");
    assert.equal(parseItalianDecimal("1.250,00").toFixed(2), "1250.00");
    assert.equal(parseItalianDecimal("€ 15.000").toFixed(2), "15000.00");
  });

  it("formatta con simbolo e separatori italiani", () => {
    assert.equal(formatEUR("1250"), "€ 1.250,00");
    assert.equal(formatEUR("-400"), "-€ 400,00");
  });
});
