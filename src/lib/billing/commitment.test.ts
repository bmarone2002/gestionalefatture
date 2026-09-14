import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertCanIssueAgainstCommitment,
  forecastCommitment,
  InsufficientCommitmentError,
  remainingCommitment,
} from "@/lib/billing/commitment";
import { getCurrentPeriod, getNextPeriod } from "@/lib/billing/periods";
import { formatEUR } from "@/lib/money";

describe("Impegno dei Comuni", () => {
  it("TEST 6 — impegno €5.000, prima fattura €1.500, residuo €3.500", () => {
    const remaining = remainingCommitment("5000.00", "1500.00");
    assert.equal(remaining.toFixed(2), "3500.00");
    assert.equal(formatEUR(remaining), "€ 3.500,00");
  });

  it("TEST 7 — residuo €500 vs prossima €750 → CRITICO e blocco emissione", () => {
    const nextPeriod = getCurrentPeriod("2026-10-01", "QUARTERLY");
    const forecast = forecastCommitment({
      commitmentAmount: "2000.00",
      issuedTotal: "1500.00",
      nextInvoiceAmount: "750.00",
      nextPeriod,
      frequency: "QUARTERLY",
    });

    assert.equal(forecast.remaining.toFixed(2), "500.00");
    assert.equal(forecast.status, "CRITICAL");
    assert.equal(forecast.canIssueNext, false);
    assert.equal(forecast.fundableInvoiceCount, 0);

    assert.throws(
      () => assertCanIssueAgainstCommitment(forecast.remaining, "750.00"),
      (error: unknown) => error instanceof InsufficientCommitmentError,
    );
  });

  it("previsione esaurimento: 3 fatture da €2.000 con residuo €6.000", () => {
    const nextPeriod = getCurrentPeriod("2026-10-01", "QUARTERLY");
    const forecast = forecastCommitment({
      commitmentAmount: "15000.00",
      issuedTotal: "9000.00",
      nextInvoiceAmount: "2000.00",
      nextPeriod,
      frequency: "QUARTERLY",
    });

    assert.equal(forecast.fundableInvoiceCount, 3);
    assert.equal(forecast.status, "OK");
    assert.equal(forecast.exhaustionDate, "2027-07-01");
    assert.equal(getNextPeriod(getNextPeriod(getNextPeriod(nextPeriod))).scheduledDate, "2027-07-01");
  });

  it("ATTENZIONE con 2 fatture ancora finanziabili", () => {
    const forecast = forecastCommitment({
      commitmentAmount: "5000.00",
      issuedTotal: "2000.00",
      nextInvoiceAmount: "1500.00",
      nextPeriod: getCurrentPeriod("2026-10-01", "QUARTERLY"),
      frequency: "QUARTERLY",
    });
    assert.equal(forecast.fundableInvoiceCount, 2);
    assert.equal(forecast.status, "ATTENTION");
    assert.equal(forecast.canIssueNext, true);
  });
});
