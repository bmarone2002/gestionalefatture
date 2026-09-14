import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planClientInvoices } from "@/lib/billing/horizon";
import { getCurrentPeriod, getNextPeriod } from "@/lib/billing/periods";

describe("Registrazione cliente e periodi", () => {
  it("TEST 1 — trimestrale registrato il 14/09/2026", () => {
    const plan = planClientInvoices({
      registrationDate: "2026-09-14",
      frequency: "QUARTERLY",
      boxQuantity: 500,
      monthlyPricePerBox: "0.50",
      today: "2026-09-14",
    });

    assert.equal(plan.first.periodStart, "2026-07-01");
    assert.equal(plan.first.periodEnd, "2026-09-30");
    assert.equal(plan.first.status, "ISSUED");
    assert.equal(plan.nextScheduledDate, "2026-10-01");
  });

  it("TEST 2 — trimestrale registrato il 01/01/2026", () => {
    const current = getCurrentPeriod("2026-01-01", "QUARTERLY");
    assert.equal(current.start, "2026-01-01");
    assert.equal(current.end, "2026-03-31");
    const next = getNextPeriod(current);
    assert.equal(next.scheduledDate, "2026-04-01");
    assert.equal(next.start, "2026-04-01");
    assert.equal(next.end, "2026-06-30");
  });

  it("TEST 3 — semestrale registrato il 14/09/2026", () => {
    const plan = planClientInvoices({
      registrationDate: "2026-09-14",
      frequency: "SEMIANNUAL",
      boxQuantity: 500,
      monthlyPricePerBox: "0.50",
      today: "2026-09-14",
    });

    assert.equal(plan.first.periodStart, "2026-07-01");
    assert.equal(plan.first.periodEnd, "2026-12-31");
    assert.equal(plan.first.status, "ISSUED");
    assert.equal(plan.nextScheduledDate, "2027-01-01");
  });

  it("il giorno esatto di inizio periodo non sposta il trimestre", () => {
    const current = getCurrentPeriod("2026-04-01", "QUARTERLY");
    assert.equal(current.start, "2026-04-01");
    assert.equal(current.end, "2026-06-30");
    assert.equal(getNextPeriod(current).scheduledDate, "2026-07-01");
  });

  it("il 31 dicembre appartiene al Q4 / S2", () => {
    const q = getCurrentPeriod("2026-12-31", "QUARTERLY");
    assert.equal(q.start, "2026-10-01");
    assert.equal(q.end, "2026-12-31");
    const s = getCurrentPeriod("2026-12-31", "SEMIANNUAL");
    assert.equal(s.start, "2026-07-01");
    assert.equal(s.end, "2026-12-31");
    assert.equal(getNextPeriod(s).scheduledDate, "2027-01-01");
  });
});
