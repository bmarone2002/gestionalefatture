import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/**
 * Compatibility bridge used while legacy Client economics remain in place.
 * It is idempotent and gives every legacy/new client a complete billing domain.
 */
export async function ensureClientBillingDomain(clientId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${clientId} FOR UPDATE`;
    const client = await tx.client.findUnique({
      where: { id: clientId },
      include: { invoices: { include: { lines: true } } },
    });
    if (!client) throw new Error("Cliente non trovato");
    const storageDefinition = await tx.serviceDefinition.findUnique({ where: { code: "STORAGE" } });
    if (!storageDefinition) throw new Error("Catalogo stoccaggio non inizializzato");

    let contract = await tx.contract.findFirst({
      where: { clientId, kind: "STORAGE", active: true },
      include: { versions: { orderBy: { versionNumber: "desc" } } },
    });
    if (!contract) {
      contract = await tx.contract.create({
        data: {
          clientId,
          kind: "STORAGE",
          name: "Contratto stoccaggio",
          startDate: client.registrationDate,
          active: client.active,
          createdById: client.createdById,
          versions: {
            create: {
              versionNumber: 1,
              effectiveFrom: client.registrationDate,
              determina: client.determina,
              cig: client.cig,
              commitmentAmount: client.commitmentAmount,
            },
          },
        },
        include: { versions: { orderBy: { versionNumber: "desc" } } },
      });
    }
    const version = contract.versions[0] ??
      await tx.contractVersion.create({
        data: {
          contractId: contract.id,
          versionNumber: 1,
          effectiveFrom: client.registrationDate,
          determina: client.determina,
          cig: client.cig,
          commitmentAmount: client.commitmentAmount,
        },
      });

    const clientService = await tx.clientService.upsert({
      where: {
        clientId_contractId_serviceDefinitionId: {
          clientId,
          contractId: contract.id,
          serviceDefinitionId: storageDefinition.id,
        },
      },
      update: { active: client.active, billingFrequency: client.billingFrequency },
      create: {
        clientId,
        contractId: contract.id,
        serviceDefinitionId: storageDefinition.id,
        billingFrequency: client.billingFrequency,
        active: client.active,
      },
    });
    const existingPrice = await tx.priceVersion.findFirst({
      where: { clientServiceId: clientService.id },
    });
    if (!existingPrice) {
      await tx.priceVersion.create({
        data: {
          clientServiceId: clientService.id,
          unitPriceVatIncluded: client.monthlyPricePerBox,
          effectiveFrom: client.registrationDate,
          source: "LEGACY_BRIDGE",
        },
      });
    }
    const stockCount = await tx.stockMovement.count({ where: { contractId: contract.id } });
    if (stockCount === 0 && client.boxQuantity > 0) {
      await tx.stockMovement.create({
        data: {
          clientId,
          contractId: contract.id,
          type: "IN",
          quantity: client.boxQuantity,
          occurredOn: client.registrationDate,
          reason: "Consistenza iniziale",
        },
      });
    }

    for (const invoice of client.invoices) {
      if (!invoice.contractId) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            contractId: contract.id,
            contractVersionId: version.id,
            idempotencyKey: invoice.idempotencyKey ?? `storage:${contract.id}:${invoice.periodStart.toISOString().slice(0, 10)}`,
          },
        });
      }
      if (invoice.lines.length === 0) {
        await tx.invoiceLine.create({
          data: {
            invoiceId: invoice.id,
            serviceDefinitionId: storageDefinition.id,
            description: "Stoccaggio scatole",
            quantity: invoice.boxQuantitySnapshot,
            unit: "BOX",
            unitPriceVatIncluded: invoice.monthlyPriceSnapshot,
            months: invoice.monthsSnapshot,
            periodStart: invoice.periodStart,
            periodEnd: invoice.periodEnd,
            amountVatIncluded: invoice.amount,
          },
        });
      }
    }
    return contract;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

