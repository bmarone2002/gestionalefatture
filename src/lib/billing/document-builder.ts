import type { AggregatedMovement } from "@/lib/billing/movement-aggregation";
import type { QuarterlyStorageCharge } from "@/lib/billing/quarterly-storage-calendar";
import { assertCalendarDate, type CalendarDate } from "@/lib/dates/calendar-date";
import { money, roundEuro, type Decimal } from "@/lib/money";

export type BillingDocumentLine =
  | {
      kind: "STORAGE";
      description: string;
      periodStart: CalendarDate;
      periodEnd: CalendarDate;
      quantity: Decimal;
      months: number;
      amount: Decimal;
    }
  | {
      kind: "MOVEMENT";
      serviceId: string;
      description: string;
      periodStart: CalendarDate;
      periodEnd: CalendarDate;
      quantity: Decimal;
      movementIds: string[];
      amount: Decimal;
    };

export type BillingDocument = {
  contractId: string;
  documentDate: CalendarDate;
  lines: BillingDocumentLine[];
  total: Decimal;
};

/**
 * Prepara un documento per contratto: stoccaggio da anticipare dalla data del
 * documento e movimentazioni già avvenute prima della stessa data.
 */
export function buildBillingDocuments(input: {
  documentDate: CalendarDate;
  storageCharges: readonly QuarterlyStorageCharge[];
  movements: readonly AggregatedMovement[];
}): BillingDocument[] {
  assertCalendarDate(input.documentDate);
  const documents = new Map<string, BillingDocument>();

  const documentFor = (contractId: string): BillingDocument => {
    const existing = documents.get(contractId);
    if (existing) return existing;
    const created: BillingDocument = {
      contractId,
      documentDate: input.documentDate,
      lines: [],
      total: money(0),
    };
    documents.set(contractId, created);
    return created;
  };

  const nextStorageByContract = new Map<string, QuarterlyStorageCharge>();
  for (const storage of input.storageCharges) {
    if (storage.scheduledDate < input.documentDate) continue;
    const current = nextStorageByContract.get(storage.contractId);
    if (!current || storage.scheduledDate < current.scheduledDate) {
      nextStorageByContract.set(storage.contractId, storage);
    }
  }

  for (const storage of nextStorageByContract.values()) {
    const document = documentFor(storage.contractId);
    document.lines.push({
      kind: "STORAGE",
      description: "Stoccaggio",
      periodStart: storage.periodStart,
      periodEnd: storage.periodEnd,
      quantity: money(storage.boxQuantity),
      months: storage.months,
      amount: storage.amount,
    });
  }

  for (const movement of input.movements) {
    if (movement.periodEnd >= input.documentDate) continue;
    const document = documentFor(movement.contractId);
    document.lines.push({
      kind: "MOVEMENT",
      serviceId: movement.serviceId,
      description: movement.serviceName,
      periodStart: movement.periodStart,
      periodEnd: movement.periodEnd,
      quantity: movement.quantity,
      movementIds: [...movement.movementIds],
      amount: movement.total,
    });
  }

  for (const document of documents.values()) {
    document.total = roundEuro(
      document.lines.reduce((total, line) => total.plus(line.amount), money(0)),
    );
  }

  return [...documents.values()].sort((a, b) =>
    a.contractId.localeCompare(b.contractId),
  );
}
