import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  todayRome,
  formatItalianDate,
  fromUtcDate,
  toUtcDate,
  calendarDateFromRomeOffset,
} from "@/lib/dates/calendar-date";

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

  it("todayRome usa il calendario di Roma, non UTC", () => {
    assert.equal(todayRome(new Date("2026-09-14T12:00:00.000Z")), "2026-09-14");
    assert.equal(todayRome(new Date("2026-09-14T22:30:00.000Z")), "2026-09-15");
  });

  it("il fallback CET/CEST coincide con Europe/Rome", () => {
    const samples = [
      "2026-03-29T00:59:00.000Z",
      "2026-03-29T01:00:00.000Z",
      "2026-09-14T22:30:00.000Z",
      "2026-10-25T00:59:00.000Z",
      "2026-10-25T01:00:00.000Z",
    ];
    for (const iso of samples) {
      const now = new Date(iso);
      assert.equal(calendarDateFromRomeOffset(now), todayRome(now), iso);
    }
  });
});
