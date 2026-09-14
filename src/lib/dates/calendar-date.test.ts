import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { todayRome, formatItalianDate, fromUtcDate, toUtcDate } from "@/lib/dates/calendar-date";

describe("Date amministrative", () => {
  it("non sposta il 1 ottobre in 30 settembre per via UTC", () => {
    const utc = toUtcDate("2026-10-01");
    assert.equal(utc.toISOString(), "2026-10-01T00:00:00.000Z");
    assert.equal(fromUtcDate(utc), "2026-10-01");
    assert.equal(formatItalianDate("2026-10-01"), "01/10/2026");
  });

  it("todayRome restituisce YYYY-MM-DD", () => {
    assert.match(todayRome(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
