import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateMovementsByService } from "@/lib/billing/movement-aggregation";

describe("Aggregazione movimentazioni per servizio", () => {
  it("somma quantità e importi mantenendo separati i contratti", () => {
    const groups = aggregateMovementsByService([
      {
        id: "m1",
        contractId: "c1",
        serviceId: "scan",
        serviceName: "Scansione",
        occurredOn: "2026-01-10",
        quantity: "2.5",
        total: "5.01",
      },
      {
        id: "m2",
        contractId: "c1",
        serviceId: "scan",
        serviceName: "Scansione",
        occurredOn: "2026-02-10",
        quantity: 3,
        total: "6.02",
      },
      {
        id: "m3",
        contractId: "c2",
        serviceId: "scan",
        serviceName: "Scansione",
        occurredOn: "2026-01-15",
        quantity: 1,
        total: 2,
      },
    ]);

    assert.equal(groups.length, 2);
    assert.equal(groups[0]?.quantity.toFixed(3), "5.500");
    assert.equal(groups[0]?.total.toFixed(2), "11.03");
    assert.deepEqual(groups[0]?.movementIds, ["m1", "m2"]);
    assert.equal(groups[0]?.periodStart, "2026-01-10");
    assert.equal(groups[0]?.periodEnd, "2026-02-10");
  });
});
