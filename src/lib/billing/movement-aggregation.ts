import { assertCalendarDate, type CalendarDate } from "@/lib/dates/calendar-date";
import { money, roundEuro, type Decimal, type MoneyValue } from "@/lib/money";

export type BillableMovement = {
  id: string;
  contractId: string;
  serviceId: string;
  serviceName: string;
  occurredOn: CalendarDate;
  quantity: MoneyValue;
  total: MoneyValue;
};

export type AggregatedMovement = {
  contractId: string;
  serviceId: string;
  serviceName: string;
  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  quantity: Decimal;
  total: Decimal;
  movementIds: string[];
};

/** Aggrega senza mescolare lo stesso servizio appartenente a contratti diversi. */
export function aggregateMovementsByService(
  movements: readonly BillableMovement[],
): AggregatedMovement[] {
  const groups = new Map<string, AggregatedMovement>();

  for (const movement of movements) {
    assertCalendarDate(movement.occurredOn);
    if (!movement.contractId || !movement.serviceId) {
      throw new Error("Contratto e servizio sono obbligatori");
    }
    const quantity = money(movement.quantity);
    const total = money(movement.total);
    if (quantity.isNegative()) throw new Error("La quantità non può essere negativa");

    const key = `${movement.contractId}\u0000${movement.serviceId}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, {
        contractId: movement.contractId,
        serviceId: movement.serviceId,
        serviceName: movement.serviceName,
        periodStart: movement.occurredOn,
        periodEnd: movement.occurredOn,
        quantity,
        total,
        movementIds: [movement.id],
      });
      continue;
    }

    group.quantity = group.quantity.plus(quantity);
    group.total = group.total.plus(total);
    group.periodStart =
      movement.occurredOn < group.periodStart
        ? movement.occurredOn
        : group.periodStart;
    group.periodEnd =
      movement.occurredOn > group.periodEnd ? movement.occurredOn : group.periodEnd;
    group.movementIds.push(movement.id);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, total: roundEuro(group.total) }))
    .sort(
      (a, b) =>
        a.contractId.localeCompare(b.contractId) ||
        a.serviceName.localeCompare(b.serviceName) ||
        a.serviceId.localeCompare(b.serviceId),
    );
}
