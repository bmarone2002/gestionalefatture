import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { contractSchema, contractVersionSchema } from "@/lib/validation/billing";
import { parseItalianDecimal } from "@/lib/money";
import { toPrismaDate } from "@/server/mappers";

export async function createContract(rawInput: unknown, userId: string) {
  const input = contractSchema.parse(rawInput);
  const commitment = input.commitmentAmount
    ? parseItalianDecimal(input.commitmentAmount)
    : null;
  const storagePrice = input.storagePrice ? parseItalianDecimal(input.storagePrice) : null;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${input.clientId} FOR UPDATE`;
    const client = await tx.client.findUnique({ where: { id: input.clientId } });
    if (!client) throw new Error("Cliente non trovato");

    const existing = await tx.contract.findFirst({
      where: { clientId: input.clientId, kind: input.kind, active: true },
    });
    if (existing) {
      throw new Error(
        input.kind === "STORAGE"
          ? "Esiste già un contratto di stoccaggio attivo"
          : "Esiste già un contratto movimentazioni attivo",
      );
    }

    const contract = await tx.contract.create({
      data: {
        clientId: input.clientId,
        kind: input.kind,
        name: input.name,
        startDate: toPrismaDate(input.startDate),
        endDate: input.endDate ? toPrismaDate(input.endDate) : null,
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            effectiveFrom: toPrismaDate(input.startDate),
            determina: input.determina,
            cig: input.cig,
            commitmentAmount: commitment?.toFixed(2),
            notes: input.notes,
          },
        },
      },
      include: { versions: true },
    });

    if (input.kind === "STORAGE" && storagePrice) {
      const storage = await tx.serviceDefinition.findUnique({ where: { code: "STORAGE" } });
      if (!storage) throw new Error("Servizio stoccaggio non configurato");
      const clientService = await tx.clientService.create({
        data: {
          clientId: input.clientId,
          contractId: contract.id,
          serviceDefinitionId: storage.id,
          billingFrequency: input.billingFrequency ?? "QUARTERLY",
        },
      });
      await tx.priceVersion.create({
        data: {
          clientServiceId: clientService.id,
          unitPriceVatIncluded: storagePrice.toFixed(4),
          effectiveFrom: toPrismaDate(input.startDate),
        },
      });
      if ((input.initialBoxQuantity ?? 0) > 0) {
        await tx.stockMovement.create({
          data: {
            clientId: input.clientId,
            contractId: contract.id,
            type: "IN",
            quantity: input.initialBoxQuantity!,
            occurredOn: toPrismaDate(input.startDate),
            reason: "Consistenza iniziale",
          },
        });
      }
    }
    return contract;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function addContractVersion(rawInput: unknown) {
  const input = contractVersionSchema.parse(rawInput);
  const commitment = input.commitmentAmount
    ? parseItalianDecimal(input.commitmentAmount)
    : null;

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Contract" WHERE id = ${input.contractId} FOR UPDATE`;
    const latest = await tx.contractVersion.findFirst({
      where: { contractId: input.contractId },
      orderBy: { versionNumber: "desc" },
    });
    if (!latest) throw new Error("Contratto non trovato");
    const effectiveFrom = toPrismaDate(input.effectiveFrom);
    if (effectiveFrom <= latest.effectiveFrom) {
      throw new Error("La nuova versione deve decorrere dopo quella precedente");
    }
    await tx.contractVersion.update({
      where: { id: latest.id },
      data: { effectiveTo: new Date(effectiveFrom.getTime() - 86_400_000) },
    });
    const version = await tx.contractVersion.create({
      data: {
        contractId: input.contractId,
        versionNumber: latest.versionNumber + 1,
        effectiveFrom,
        determina: input.determina,
        cig: input.cig,
        commitmentAmount: commitment?.toFixed(2),
        notes: input.notes,
      },
    });
    await tx.invoice.updateMany({
      where: {
        contractId: input.contractId,
        status: "TO_ISSUE",
        scheduledDate: { gte: effectiveFrom },
      },
      data: { contractVersionId: version.id },
    });
    return version;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listExpiringContracts(until: Date) {
  return prisma.contract.findMany({
    where: { active: true, endDate: { lte: until } },
    include: { client: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: { endDate: "asc" },
  });
}

export async function closeContract(contractId: string, endDate: string) {
  return prisma.contract.update({
    where: { id: contractId },
    data: { active: false, endDate: toPrismaDate(endDate) },
  });
}

