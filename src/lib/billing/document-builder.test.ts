import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBillingDocuments } from "@/lib/billing/document-builder";
import { aggregateMovementsByService } from "@/lib/billing/movement-aggregation";
import { buildQuarterlyStorageCalendar } from "@/lib/billing/quarterly-storage-calendar";

describe("Document builder", () => {
  it("combina prossimo stoccaggio e movimenti passati dello stesso contratto", () => {
    const storage = buildQuarterlyStorageCalendar({
      contractId: "c1",
      startsOn: "2026-01-01",
      through: "2026-07-01",
      boxQuantity: 100,
      prices: [{ effectiveFrom: "2026-01-01", unitPrice: "0.50" }],
    });
    const movements = aggregateMovementsByService([
      {
        id: "m1",
        contractId: "c1",
        serviceId: "delivery",
        serviceName: "Consegna",
        occurredOn: "2026-03-20",
        quantity: 1,
        total: 25,
      },
      {
        id: "m2",
        contractId: "c2",
        serviceId: "delivery",
        serviceName: "Consegna",
        occurredOn: "2026-03-21",
        quantity: 1,
        total: 30,
      },
    ]);

    const documents = buildBillingDocuments({
      documentDate: "2026-04-01",
      storageCharges: storage,
      movements,
    });

    assert.equal(documents.length, 2);
    assert.equal(documents[0]?.contractId, "c1");
    assert.deepEqual(documents[0]?.lines.map((line) => line.kind), [
      "STORAGE",
      "MOVEMENT",
    ]);
    assert.equal(documents[0]?.total.toFixed(2), "175.00");
    assert.equal(documents[1]?.contractId, "c2");
    assert.equal(documents[1]?.lines.length, 1);
  });

  it("esclude movimenti non ancora passati", () => {
    const movements = aggregateMovementsByService([
      {
        id: "m1",
        contractId: "c1",
        serviceId: "delivery",
        serviceName: "Consegna",
        occurredOn: "2026-04-01",
        quantity: 1,
        total: 25,
      },
    ]);
    assert.deepEqual(
      buildBillingDocuments({
        documentDate: "2026-04-01",
        storageCharges: [],
        movements,
      }),
      [],
    );
  });
});
