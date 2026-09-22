import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQuarterlyStorageCalendar } from "@/lib/billing/quarterly-storage-calendar";

describe("Calendario stoccaggio trimestrale anticipato", () => {
  it("include il mese iniziale nella prima frazione", () => {
    const charges = buildQuarterlyStorageCalendar({
      contractId: "storage-1",
      startsOn: "2026-02-14",
      through: "2026-07-01",
      boxQuantity: 100,
      prices: [{ effectiveFrom: "2026-01-01", unitPrice: "0.50" }],
    });

    assert.deepEqual(
      charges.map((charge) => ({
        start: charge.periodStart,
        end: charge.periodEnd,
        scheduled: charge.scheduledDate,
        months: charge.months,
        amount: charge.amount.toFixed(2),
      })),
      [
        {
          start: "2026-02-01",
          end: "2026-03-31",
          scheduled: "2026-02-14",
          months: 2,
          amount: "100.00",
        },
        {
          start: "2026-04-01",
          end: "2026-06-30",
          scheduled: "2026-04-01",
          months: 3,
          amount: "150.00",
        },
        {
          start: "2026-07-01",
          end: "2026-09-30",
          scheduled: "2026-07-01",
          months: 3,
          amount: "150.00",
        },
      ],
    );
  });

  it("applica al trimestre successivo il prezzo con nuova decorrenza", () => {
    const charges = buildQuarterlyStorageCalendar({
      contractId: "storage-1",
      startsOn: "2026-03-10",
      through: "2026-04-01",
      boxQuantity: 10,
      prices: [
        { effectiveFrom: "2026-01-01", effectiveTo: "2026-03-31", unitPrice: 1 },
        { effectiveFrom: "2026-04-01", unitPrice: "1.25" },
      ],
    });

    assert.equal(charges[0]?.amount.toFixed(2), "10.00");
    assert.equal(charges[1]?.amount.toFixed(2), "37.50");
  });
});
