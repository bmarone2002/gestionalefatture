import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { parseItalianDecimal, money, roundEuro } from "@/lib/money";
import { serviceMovementSchema, stockMovementSchema } from "@/lib/validation/billing";
import { fromPrismaDate, toPrismaDate } from "@/server/mappers";
import { getCurrentPeriod, getNextPeriod } from "@/lib/billing/periods";
import { parseCalendarDate, type CalendarDate } from "@/lib/dates/calendar-date";

type BillableMovement = Prisma.ServiceMovementGetPayload<{
  include: {
    clientService: true;
    serviceDefinition: true;
    contract: { include: { versions: true } };
  };
}>;

export async function recordStockMovement(rawInput: unknown, userId: string) {
  const input = stockMovementSchema.parse(rawInput);
  return prisma.$transaction(
    (tx) => recordStockMovementInTransaction(tx, input, userId),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function recordServiceMovement(rawInput: unknown, userId: string) {
  const input = serviceMovementSchema.parse(rawInput);
  return prisma.$transaction(async (tx) => {
    const clientService = await tx.clientService.findUnique({
      where: { id: input.clientServiceId },
      include: { serviceDefinition: true, contract: true },
    });
    if (!clientService?.active || !clientService.contract.active) {
      throw new Error("Servizio o contratto non attivo");
    }
    const quantity = money(input.quantity);
    let unitPrice = input.unitPrice ? parseItalianDecimal(input.unitPrice) : null;
    if (!unitPrice && !input.total) {
      const listPrice = await tx.priceVersion.findFirst({
        where: {
          clientServiceId: clientService.id,
          effectiveFrom: { lte: toPrismaDate(input.occurredOn) },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: toPrismaDate(input.occurredOn) } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      if (!listPrice) {
        throw new Error("Prezzo listino non trovato: indicare un prezzo o un totale");
      }
      unitPrice = money(listPrice.unitPriceVatIncluded.toString());
    }
    const total = input.total
      ? parseItalianDecimal(input.total)
      : roundEuro(quantity.mul(unitPrice!));
    if (total.isNegative()) throw new Error("Il totale non può essere negativo");

    const movement = await tx.serviceMovement.create({
      data: {
        clientId: clientService.clientId,
        contractId: clientService.contractId,
        clientServiceId: clientService.id,
        serviceDefinitionId: clientService.serviceDefinitionId,
        occurredOn: toPrismaDate(input.occurredOn),
        description: input.description,
        quantity: quantity.toFixed(3),
        unitPriceVatIncluded: unitPrice?.toFixed(4),
        totalVatIncluded: total.toFixed(2),
        permanentStockExit: input.permanentStockExit,
        stockQuantity: input.stockQuantity,
        createdById: userId,
      },
    });

    const causesExit =
      clientService.serviceDefinition.code === "MACERO" || input.permanentStockExit;
    if (causesExit) {
      const storageContract = await tx.contract.findFirst({
        where: { clientId: clientService.clientId, kind: "STORAGE", active: true },
      });
      if (!storageContract) throw new Error("Contratto stoccaggio attivo non trovato");
      const quantityOut = input.stockQuantity ??
        (clientService.serviceDefinition.code === "MACERO" ? Math.trunc(input.quantity) : undefined);
      if (!quantityOut || quantityOut <= 0) {
        throw new Error("Indicare il numero di scatole che escono dallo stoccaggio");
      }
      await recordStockMovementInTransaction(tx, {
        contractId: storageContract.id,
        type: "OUT",
        quantity: quantityOut,
        occurredOn: input.occurredOn,
        reason: `${clientService.serviceDefinition.name}${input.description ? ` — ${input.description}` : ""}`,
      }, userId, movement.id);
    }
    return movement;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function billCompletedMovements(today: CalendarDate) {
  const movements = await prisma.serviceMovement.findMany({
    where: { invoiceLineId: null, occurredOn: { lt: toPrismaDate(today) } },
    include: {
      clientService: true,
      serviceDefinition: true,
      contract: { include: { versions: { orderBy: { versionNumber: "desc" } } } },
    },
    orderBy: { occurredOn: "asc" },
  });

  const groups = new Map<string, BillableMovement[]>();
  for (const movement of movements) {
    const frequency = movement.clientService.billingFrequency ?? "QUARTERLY";
    if (frequency === "ANNUAL") continue;
    const period = getCurrentPeriod(fromPrismaDate(movement.occurredOn), frequency);
    const billingDate = getNextPeriod(period).start;
    if (billingDate > today) continue;
    const key = `${movement.contractId}:${period.start}:${period.end}:${billingDate}`;
    groups.set(key, [...(groups.get(key) ?? []), movement]);
  }

  for (const group of groups.values()) {
    await createMovementDocument(group);
  }
}

async function createMovementDocument(
  movements: BillableMovement[],
) {
  const first = movements[0];
  if (!first) return;
  const frequency = first.clientService.billingFrequency ?? "QUARTERLY";
  if (frequency === "ANNUAL") return;
  const movementPeriod = getCurrentPeriod(fromPrismaDate(first.occurredOn), frequency);
  const billingDate = getNextPeriod(movementPeriod).start;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${first.contractId} FOR UPDATE`;
    const billingDateValue = toPrismaDate(billingDate);
    let invoice = await tx.invoice.findFirst({
      where: {
        contractId: first.contractId,
        scheduledDate: billingDateValue,
        invoiceType: "ORDINARY",
        status: "TO_ISSUE",
      },
    });
    const version = first.contract.versions
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .find((item) =>
        item.effectiveFrom <= billingDateValue &&
        (item.effectiveTo == null || item.effectiveTo >= billingDateValue),
      );

    if (!invoice) {
      invoice = await tx.invoice.create({
        data: {
          clientId: first.clientId,
          contractId: first.contractId,
          contractVersionId: version?.id,
          invoiceType: "ORDINARY",
          periodStart: toPrismaDate(movementPeriod.start),
          periodEnd: toPrismaDate(movementPeriod.end),
          scheduledDate: billingDateValue,
          billingFrequency: frequency,
          boxQuantitySnapshot: 0,
          monthlyPriceSnapshot: "0",
          monthsSnapshot: frequency === "SEMIANNUAL" ? 6 : 3,
          amount: "0",
          status: "TO_ISSUE",
          idempotencyKey: `movements:${first.contractId}:${movementPeriod.start}:${movementPeriod.end}`,
        },
      });
    }

    const byService = new Map<string, BillableMovement[]>();
    for (const movement of movements) {
      byService.set(movement.serviceDefinitionId, [
        ...(byService.get(movement.serviceDefinitionId) ?? []),
        movement,
      ]);
    }
    let added = money(0);
    for (const serviceMovements of byService.values()) {
      const sample = serviceMovements[0]!;
      const quantity = serviceMovements.reduce(
        (sum, item) => sum.plus(item.quantity.toString()),
        money(0),
      );
      const amount = serviceMovements.reduce(
        (sum, item) => sum.plus(item.totalVatIncluded.toString()),
        money(0),
      );
      const line = await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          serviceDefinitionId: sample.serviceDefinitionId,
          description: sample.serviceDefinition.name,
          quantity: quantity.toFixed(3),
          unit: sample.serviceDefinition.unit,
          unitPriceVatIncluded: quantity.isZero() ? "0" : amount.div(quantity).toFixed(4),
          periodStart: toPrismaDate(movementPeriod.start),
          periodEnd: toPrismaDate(movementPeriod.end),
          amountVatIncluded: roundEuro(amount).toFixed(2),
        },
      });
      await tx.serviceMovement.updateMany({
        where: { id: { in: serviceMovements.map((item) => item.id) }, invoiceLineId: null },
        data: { invoiceLineId: line.id },
      });
      added = added.plus(amount);
    }
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { amount: roundEuro(money(invoice.amount.toString()).plus(added)).toFixed(2) },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

type StockInput = {
  contractId: string;
  type: "IN" | "OUT";
  quantity: number;
  occurredOn: string;
  reason?: string;
};

async function recordStockMovementInTransaction(
  tx: Prisma.TransactionClient,
  input: StockInput,
  userId: string,
  serviceMovementId?: string,
) {
  await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${input.contractId} FOR UPDATE`;
  const contract = await tx.contract.findUnique({
    where: { id: input.contractId },
    include: {
      client: true,
      versions: { orderBy: { versionNumber: "desc" } },
      clientServices: {
        where: { serviceDefinition: { code: "STORAGE" }, active: true },
        include: { prices: { orderBy: { effectiveFrom: "desc" } } },
      },
      stockMovements: true,
    },
  });
  if (!contract || contract.kind !== "STORAGE" || !contract.active) {
    throw new Error("Contratto stoccaggio attivo non trovato");
  }
  const currentQuantity = contract.stockMovements.reduce(
    (sum, movement) => sum + (movement.type === "IN" ? movement.quantity : -movement.quantity),
    0,
  );
  if (input.type === "OUT" && input.quantity > currentQuantity) {
    throw new Error(`Uscita non valida: risultano ${currentQuantity} scatole in deposito`);
  }

  const stockMovement = await tx.stockMovement.create({
    data: {
      clientId: contract.clientId,
      contractId: contract.id,
      type: input.type,
      quantity: input.quantity,
      occurredOn: toPrismaDate(input.occurredOn),
      reason: input.reason,
      serviceMovementId,
    },
  });

  const storageService = contract.clientServices[0];
  if (!storageService) throw new Error("Listino stoccaggio non configurato");
  const movementDate = toPrismaDate(input.occurredOn);
  const price = storageService.prices.find(
    (item) =>
      item.effectiveFrom <= movementDate &&
      (item.effectiveTo == null || item.effectiveTo >= movementDate),
  );
  if (!price) throw new Error("Prezzo stoccaggio non disponibile per la data indicata");

  const period = getCurrentPeriod(input.occurredOn, "QUARTERLY");
  const event = parseCalendarDate(input.occurredOn)!;
  const end = parseCalendarDate(period.end)!;
  const months = input.type === "IN"
    ? end.month - event.month + 1
    : end.month - event.month;
  if (months <= 0) return stockMovement;

  const sign = input.type === "IN" ? 1 : -1;
  const amount = roundEuro(
    money(input.quantity).mul(price.unitPriceVatIncluded.toString()).mul(months).mul(sign),
  );
  const version = contract.versions.find(
    (item) =>
      item.effectiveFrom <= movementDate &&
      (item.effectiveTo == null || item.effectiveTo >= movementDate),
  ) ?? contract.versions[0];

  await tx.invoice.create({
    data: {
      clientId: contract.clientId,
      contractId: contract.id,
      contractVersionId: version?.id,
      invoiceType: input.type === "IN" ? "SUPPLEMENTARY" : "CREDIT_NOTE",
      periodStart: movementDate,
      periodEnd: toPrismaDate(period.end),
      scheduledDate: movementDate,
      billingFrequency: "QUARTERLY",
      boxQuantitySnapshot: input.quantity,
      monthlyPriceSnapshot: price.unitPriceVatIncluded,
      monthsSnapshot: months,
      amount: amount.toFixed(2),
      status: "TO_ISSUE",
      idempotencyKey: `stock-adjustment:${stockMovement.id}`,
      createdById: userId,
      notes: input.reason,
      lines: {
        create: {
          serviceDefinitionId: storageService.serviceDefinitionId,
          description: input.type === "IN"
            ? `Integrazione stoccaggio: ${input.quantity} scatole`
            : `Storno stoccaggio: ${input.quantity} scatole`,
          quantity: (input.quantity * sign).toFixed(3),
          unit: "BOX",
          unitPriceVatIncluded: price.unitPriceVatIncluded,
          months,
          periodStart: movementDate,
          periodEnd: toPrismaDate(period.end),
          amountVatIncluded: amount.toFixed(2),
        },
      },
    },
  });
  return stockMovement;
}

