import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { inflationConfirmSchema, inflationPreviewSchema } from "@/lib/validation/billing";
import { money, parseItalianDecimal, roundEuro } from "@/lib/money";
import { toPrismaDate } from "@/server/mappers";

export async function createInflationPreview(rawInput: unknown) {
  const input = inflationPreviewSchema.parse(rawInput);
  const percentage = parseItalianDecimal(input.percentage);
  if (percentage.lessThanOrEqualTo(-100)) {
    throw new Error("La percentuale deve essere maggiore di -100%");
  }
  const contracts = await prisma.contract.findMany({
    where: { active: true },
    select: { id: true },
  });
  const effectiveFrom = toPrismaDate(input.effectiveFrom);
  await prisma.$transaction(
    contracts.map((contract) =>
      prisma.inflationAdjustment.upsert({
        where: {
          contractId_effectiveFrom: { contractId: contract.id, effectiveFrom },
        },
        update: { percentage: percentage.toFixed(4), status: "PREVIEW" },
        create: {
          contractId: contract.id,
          percentage: percentage.toFixed(4),
          effectiveFrom,
        },
      }),
    ),
  );
  return listInflationPreview(input.effectiveFrom);
}

export async function listInflationPreview(effectiveFrom?: string) {
  return prisma.inflationAdjustment.findMany({
    where: {
      status: "PREVIEW",
      ...(effectiveFrom ? { effectiveFrom: toPrismaDate(effectiveFrom) } : {}),
    },
    include: {
      contract: {
        include: {
          client: true,
          clientServices: {
            where: { active: true },
            include: {
              serviceDefinition: true,
              prices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { contract: { client: { name: "asc" } } },
  });
}

export async function confirmInflationAdjustments(rawInput: unknown, userId: string) {
  const input = inflationConfirmSchema.parse(rawInput);
  for (const adjustmentId of input.adjustmentIds) {
    await confirmOne(adjustmentId, userId);
  }
}

async function confirmOne(adjustmentId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "InflationAdjustment" WHERE id = ${adjustmentId} FOR UPDATE`;
    const adjustment = await tx.inflationAdjustment.findUnique({
      where: { id: adjustmentId },
      include: {
        contract: {
          include: {
            clientServices: {
              where: { active: true },
              include: {
                serviceDefinition: true,
                prices: { orderBy: { effectiveFrom: "desc" } },
              },
            },
          },
        },
      },
    });
    if (!adjustment) throw new Error("Adeguamento non trovato");
    if (adjustment.status !== "PREVIEW") return adjustment;

    const multiplier = money(1).plus(money(adjustment.percentage.toString()).div(100));
    for (const clientService of adjustment.contract.clientServices) {
      const current = clientService.prices.find(
        (price) =>
          price.effectiveFrom <= adjustment.effectiveFrom &&
          (price.effectiveTo == null || price.effectiveTo >= adjustment.effectiveFrom),
      ) ?? clientService.prices[0];
      if (!current) continue;
      const adjustedPrice = roundEuro(
        money(current.unitPriceVatIncluded.toString()).mul(multiplier),
      );
      if (current.effectiveFrom.getTime() === adjustment.effectiveFrom.getTime()) {
        await tx.priceVersion.update({
          where: { id: current.id },
          data: {
            unitPriceVatIncluded: adjustedPrice.toFixed(4),
            source: "ISTAT",
            inflationAdjustmentId: adjustment.id,
          },
        });
      } else {
        await tx.priceVersion.update({
          where: { id: current.id },
          data: { effectiveTo: previousDay(adjustment.effectiveFrom) },
        });
        await tx.priceVersion.create({
          data: {
            clientServiceId: clientService.id,
            unitPriceVatIncluded: adjustedPrice.toFixed(4),
            effectiveFrom: adjustment.effectiveFrom,
            source: "ISTAT",
            inflationAdjustmentId: adjustment.id,
          },
        });
      }
      await repriceFutureLines(
        tx,
        clientService.serviceDefinitionId,
        clientService.serviceDefinition.billingMode,
        adjustment,
        adjustedPrice,
      );
    }
    return tx.inflationAdjustment.update({
      where: { id: adjustment.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: userId,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function repriceFutureLines(
  tx: Prisma.TransactionClient,
  serviceDefinitionId: string,
  billingMode: string,
  adjustment: { contractId: string; effectiveFrom: Date },
  adjustedPrice: ReturnType<typeof money>,
) {
  const lines = await tx.invoiceLine.findMany({
    where: {
      serviceDefinitionId,
      invoice: {
        contractId: adjustment.contractId,
        status: "TO_ISSUE",
        scheduledDate: { gte: adjustment.effectiveFrom },
      },
    },
    include: { invoice: true },
  });
  for (const line of lines) {
    const oldAmount = money(line.amountVatIncluded.toString());
    const months = billingMode === "STORAGE" ? line.months ?? 1 : 1;
    const newAmount = roundEuro(
      money(line.quantity.toString()).mul(adjustedPrice).mul(months),
    );
    await tx.invoiceLine.update({
      where: { id: line.id },
      data: {
        unitPriceVatIncluded: adjustedPrice.toFixed(4),
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
}

function previousDay(date: Date) {
  return new Date(date.getTime() - 86_400_000);
}

