import { Prisma, type ServiceBillingMode, type ServiceUnit } from "@prisma/client";
import { prisma } from "@/server/db";
import { clientServiceSchema } from "@/lib/validation/billing";
import { money, parseItalianDecimal, roundEuro } from "@/lib/money";
import { toPrismaDate } from "@/server/mappers";

export async function listStandardServices() {
  return prisma.serviceDefinition.findMany({
    where: { standard: true, active: true, code: { not: "STORAGE" } },
    orderBy: { name: "asc" },
  });
}

export async function attachRegistrationServices(
  clientId: string,
  services: Array<{
    serviceDefinitionId?: string;
    customName?: string;
    unit?: "FIXED" | "INTERVENTION" | "PAGE" | "SHIPMENT" | "BOX";
    unitPrice: string;
    billingFrequency?: "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";
  }>,
) {
  if (services.length === 0) return;
  const contract = await prisma.contract.findFirst({
    where: { clientId, kind: "STORAGE", active: true },
  });
  if (!contract) throw new Error("Contratto stoccaggio non trovato");
  const registrationDate = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: { registrationDate: true },
  });
  const effectiveFrom = registrationDate.registrationDate.toISOString().slice(0, 10);

  for (const service of services) {
    await addClientService({
      clientId,
      contractId: contract.id,
      serviceDefinitionId: service.serviceDefinitionId,
      customName: service.customName,
      unit: service.unit ?? "FIXED",
      billingMode: "USAGE",
      billingFrequency: service.billingFrequency ?? "QUARTERLY",
      unitPrice: service.unitPrice,
      effectiveFrom,
    });
  }
}

export async function addClientService(rawInput: unknown) {
  const input = clientServiceSchema.parse(rawInput);
  const price = parseItalianDecimal(input.unitPrice);
  if (price.isNegative()) throw new Error("Il prezzo non può essere negativo");

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { id: input.contractId, clientId: input.clientId, active: true },
    });
    if (!contract) throw new Error("Contratto attivo non trovato");

    let serviceDefinitionId = input.serviceDefinitionId;
    if (!serviceDefinitionId) {
      const custom = await tx.serviceDefinition.create({
        data: {
          name: input.customName!,
          unit: input.unit ?? "FIXED",
          billingMode: input.billingMode ?? "USAGE",
          clientId: input.clientId,
        },
      });
      serviceDefinitionId = custom.id;
    }

    const clientService = await tx.clientService.upsert({
      where: {
        clientId_contractId_serviceDefinitionId: {
          clientId: input.clientId,
          contractId: input.contractId,
          serviceDefinitionId,
        },
      },
      update: {
        active: true,
        billingFrequency: input.billingFrequency,
      },
      create: {
        clientId: input.clientId,
        contractId: input.contractId,
        serviceDefinitionId,
        billingFrequency: input.billingFrequency,
      },
    });

    await createPriceVersion(tx, clientService.id, input.effectiveFrom, price.toFixed(4));
    const definition = await tx.serviceDefinition.findUniqueOrThrow({
      where: { id: serviceDefinitionId },
    });
    if (definition.billingMode === "ONE_OFF" || definition.billingMode === "ANNUAL") {
      await materializeRecurringService(
        tx,
        clientService,
        definition,
        toPrismaDate(input.effectiveFrom),
        price.toFixed(4),
      );
    }
    return clientService;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function materializeRecurringService(
  tx: Prisma.TransactionClient,
  clientService: { id: string; clientId: string; contractId: string },
  definition: { id: string; name: string; unit: ServiceUnit; billingMode: ServiceBillingMode },
  firstDate: Date,
  price: string,
) {
  const dates = [firstDate];
  if (definition.billingMode === "ANNUAL") {
    dates.push(addUtcYears(firstDate, 1), addUtcYears(firstDate, 2));
  }
  const contract = await tx.contract.findUniqueOrThrow({
    where: { id: clientService.contractId },
    include: { versions: { orderBy: { versionNumber: "desc" } } },
  });
  for (const scheduledDate of dates) {
    const existingLine = await tx.invoiceLine.findFirst({
      where: {
        serviceDefinitionId: definition.id,
        invoice: { contractId: clientService.contractId, scheduledDate },
      },
    });
    if (existingLine) continue;
    const periodEnd = definition.billingMode === "ANNUAL"
      ? new Date(addUtcYears(scheduledDate, 1).getTime() - 86_400_000)
      : scheduledDate;
    let invoice = await tx.invoice.findFirst({
      where: {
        contractId: clientService.contractId,
        scheduledDate,
        invoiceType: "ORDINARY",
        status: "TO_ISSUE",
      },
    });
    const version = contract.versions.find(
      (item) =>
        item.effectiveFrom <= scheduledDate &&
        (item.effectiveTo == null || item.effectiveTo >= scheduledDate),
    ) ?? contract.versions[0];
    if (!invoice) {
      invoice = await tx.invoice.create({
        data: {
          clientId: clientService.clientId,
          contractId: clientService.contractId,
          contractVersionId: version?.id,
          periodStart: scheduledDate,
          periodEnd,
          scheduledDate,
          billingFrequency: definition.billingMode === "ANNUAL" ? "ANNUAL" : "QUARTERLY",
          boxQuantitySnapshot: 0,
          monthlyPriceSnapshot: "0",
          monthsSnapshot: definition.billingMode === "ANNUAL" ? 12 : 0,
          amount: "0",
          status: "TO_ISSUE",
          idempotencyKey: `${definition.billingMode.toLowerCase()}:${clientService.id}:${scheduledDate.toISOString().slice(0, 10)}`,
        },
      });
    }
    await tx.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        serviceDefinitionId: definition.id,
        description: definition.name,
        quantity: "1",
        unit: definition.unit,
        unitPriceVatIncluded: price,
        months: definition.billingMode === "ANNUAL" ? 12 : null,
        periodStart: scheduledDate,
        periodEnd,
        amountVatIncluded: price,
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { amount: { increment: price } },
    });
  }
}

function addUtcYears(date: Date, years: number) {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

export async function setClientServicePrice(input: {
  clientServiceId: string;
  effectiveFrom: string;
  unitPrice: string;
  source?: string;
}) {
  const price = parseItalianDecimal(input.unitPrice);
  if (price.isNegative()) throw new Error("Il prezzo non può essere negativo");
  return prisma.$transaction(async (tx) => {
    const version = await createPriceVersion(
      tx,
      input.clientServiceId,
      input.effectiveFrom,
      price.toFixed(4),
      input.source,
    );
    const clientService = await tx.clientService.findUniqueOrThrow({
      where: { id: input.clientServiceId },
      include: { serviceDefinition: true },
    });
    const lines = await tx.invoiceLine.findMany({
      where: {
        serviceDefinitionId: clientService.serviceDefinitionId,
        invoice: {
          contractId: clientService.contractId,
          status: "TO_ISSUE",
          scheduledDate: { gte: toPrismaDate(input.effectiveFrom) },
        },
      },
      include: { invoice: true },
    });
    for (const line of lines) {
      const oldAmount = money(line.amountVatIncluded.toString());
      const factor = clientService.serviceDefinition.billingMode === "STORAGE"
        ? line.months ?? 1
        : 1;
      const newAmount = roundEuro(
        money(line.quantity.toString()).mul(price).mul(factor),
      );
      await tx.invoiceLine.update({
        where: { id: line.id },
        data: {
          unitPriceVatIncluded: price.toFixed(4),
          amountVatIncluded: newAmount.toFixed(2),
        },
      });
      await tx.invoice.update({
        where: { id: line.invoiceId },
        data: {
          amount: roundEuro(
            money(line.invoice.amount.toString()).minus(oldAmount).plus(newAmount),
          ).toFixed(2),
        },
      });
    }
    return version;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function createPriceVersion(
  tx: Prisma.TransactionClient,
  clientServiceId: string,
  effectiveFromValue: string,
  price: string,
  source = "MANUAL",
) {
  await tx.$queryRaw`SELECT id FROM "ClientService" WHERE id = ${clientServiceId} FOR UPDATE`;
  const effectiveFrom = toPrismaDate(effectiveFromValue);
  const current = await tx.priceVersion.findFirst({
    where: {
      clientServiceId,
      effectiveFrom: { lte: effectiveFrom },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  if (current?.effectiveFrom.getTime() === effectiveFrom.getTime()) {
    return tx.priceVersion.update({
      where: { id: current.id },
      data: { unitPriceVatIncluded: price, source },
    });
  }
  if (current) {
    await tx.priceVersion.update({
      where: { id: current.id },
      data: { effectiveTo: new Date(effectiveFrom.getTime() - 86_400_000) },
    });
  }
  return tx.priceVersion.create({
    data: {
      clientServiceId,
      unitPriceVatIncluded: price,
      effectiveFrom,
      source,
    },
  });
}

