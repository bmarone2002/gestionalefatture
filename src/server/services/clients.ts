import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { clientFormSchema } from "@/lib/validation/client";
import { parseItalianDecimal, money } from "@/lib/money";
import {
  calculateInvoiceAmountForFrequency,
} from "@/lib/billing/amounts";
import {
  planClientInvoices,
  planFutureInvoicesFrom,
  horizonEndDate,
} from "@/lib/billing/horizon";
import { getCurrentPeriod } from "@/lib/billing/periods";
import { assertCanIssueAgainstCommitment } from "@/lib/billing/commitment";
import { fromPrismaDate, plannedInvoiceCreateData, toPrismaDate } from "@/server/mappers";
import { municipalityForecast } from "@/server/commitment";
import { todayRome } from "@/lib/dates/calendar-date";
import { ensureClientBillingDomain } from "@/server/services/legacy-billing";
import { attachRegistrationServices } from "@/server/services/service-catalog";

export async function listClients(filters: {
  q?: string;
  type?: string;
  frequency?: string;
  status?: string;
}) {
  const where: Prisma.ClientWhereInput = {};
  if (filters.q) {
    where.name = { contains: filters.q, mode: "insensitive" };
  }
  if (filters.type && filters.type !== "ALL") {
    where.type = filters.type as Prisma.ClientWhereInput["type"];
  }
  if (filters.frequency && filters.frequency !== "ALL") {
    where.billingFrequency = filters.frequency as Prisma.ClientWhereInput["billingFrequency"];
  }
  if (filters.status === "ACTIVE") {
    where.active = true;
  } else if (filters.status === "INACTIVE") {
    where.active = false;
  }

  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      invoices: {
        where: { status: "TO_ISSUE" },
        orderBy: { scheduledDate: "asc" },
        take: 1,
      },
    },
  });

  return clients.map((client) => {
    const next = client.invoices[0];
    const amount = calculateInvoiceAmountForFrequency(
      client.boxQuantity,
      client.monthlyPricePerBox.toString(),
      client.billingFrequency,
    );
    return {
      ...client,
      invoiceAmount: amount.toFixed(2),
      nextInvoiceDate: next ? fromPrismaDate(next.scheduledDate) : null,
    };
  });
}

export async function getClientById(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { scheduledDate: "desc" },
        include: { lines: { include: { serviceDefinition: true } }, payments: true, contract: true },
      },
      contracts: {
        orderBy: [{ active: "desc" }, { startDate: "desc" }],
        include: {
          versions: { orderBy: { versionNumber: "desc" } },
          stockMovements: { orderBy: { occurredOn: "desc" } },
          clientServices: {
            include: {
              serviceDefinition: true,
              prices: { orderBy: { effectiveFrom: "desc" } },
              movements: { orderBy: { occurredOn: "desc" } },
            },
          },
        },
      },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!client) {
    return null;
  }
  return {
    ...client,
    forecast: municipalityForecast(client, client.invoices),
  };
}

export async function createClient(rawInput: unknown, userId: string) {
  const parsed = clientFormSchema.parse(rawInput);
  const price = parseItalianDecimal(parsed.monthlyPricePerBox);
  const commitment =
    parsed.type === "MUNICIPALITY" && parsed.commitmentAmount
      ? parseItalianDecimal(parsed.commitmentAmount)
      : null;

  const plan = planClientInvoices({
    registrationDate: parsed.registrationDate,
    frequency: parsed.billingFrequency,
    boxQuantity: parsed.boxQuantity,
    monthlyPricePerBox: price,
  });

  if (parsed.type === "MUNICIPALITY" && commitment) {
    assertCanIssueAgainstCommitment(commitment, plan.first.amount);
  }

  const client = await prisma.$transaction(
    async (tx) => {
      const client = await tx.client.create({
        data: {
          name: parsed.name,
          type: parsed.type,
          taxCode: parsed.taxCode,
          vatNumber: parsed.vatNumber,
          notes: parsed.notes,
          boxQuantity: parsed.boxQuantity,
          monthlyPricePerBox: price.toFixed(4),
          billingFrequency: parsed.billingFrequency,
          registrationDate: toPrismaDate(parsed.registrationDate),
          determina: parsed.type === "MUNICIPALITY" ? parsed.determina : null,
          cig: parsed.type === "MUNICIPALITY" ? parsed.cig : null,
          commitmentAmount:
            parsed.type === "MUNICIPALITY" && commitment ? commitment.toFixed(2) : null,
          createdById: userId,
        },
      });

      await tx.invoice.create({
        data: {
          ...plannedInvoiceCreateData(client.id, plan.first, userId),
        },
      });

      if (plan.upcoming.length > 0) {
        await tx.invoice.createMany({
          data: plan.upcoming.map((item) => plannedInvoiceCreateData(client.id, item, userId)),
        });
      }

      return client;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await ensureClientBillingDomain(client.id);
  if (parsed.selectedServices.length > 0) {
    await attachRegistrationServices(client.id, parsed.selectedServices);
  }
  return client;
}

export async function updateClient(id: string, rawInput: unknown, userId: string) {
  const parsed = clientFormSchema.parse(rawInput);
  const price = parseItalianDecimal(parsed.monthlyPricePerBox);
  const commitment =
    parsed.type === "MUNICIPALITY" && parsed.commitmentAmount
      ? parseItalianDecimal(parsed.commitmentAmount)
      : null;

  const client = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.client.findUnique({
        where: { id },
        include: { invoices: { orderBy: { periodStart: "asc" } } },
      });
      if (!existing) {
        throw new Error("Cliente non trovato");
      }

      const frequencyChanged = existing.billingFrequency !== parsed.billingFrequency;
      const economicsChanged =
        existing.boxQuantity !== parsed.boxQuantity ||
        !money(existing.monthlyPricePerBox.toString()).eq(price);

      const client = await tx.client.update({
        where: { id },
        data: {
          name: parsed.name,
          type: parsed.type,
          taxCode: parsed.taxCode,
          vatNumber: parsed.vatNumber,
          notes: parsed.notes,
          boxQuantity: parsed.boxQuantity,
          monthlyPricePerBox: price.toFixed(4),
          billingFrequency: parsed.billingFrequency,
          registrationDate: toPrismaDate(parsed.registrationDate),
          determina: parsed.type === "MUNICIPALITY" ? parsed.determina : null,
          cig: parsed.type === "MUNICIPALITY" ? parsed.cig : null,
          commitmentAmount:
            parsed.type === "MUNICIPALITY" && commitment ? commitment.toFixed(2) : null,
        },
      });

      if (frequencyChanged) {
        await tx.invoice.deleteMany({ where: { clientId: id, status: "TO_ISSUE" } });
        const lastIssued = existing.invoices
          .filter((invoice) => invoice.status === "ISSUED")
          .at(-1);
        const months: 3 | 6 | 12 =
          lastIssued?.monthsSnapshot === 12 ? 12 : lastIssued?.monthsSnapshot === 6 ? 6 : 3;
        const afterPeriod = lastIssued
          ? {
              start: fromPrismaDate(lastIssued.periodStart),
              end: fromPrismaDate(lastIssued.periodEnd),
              scheduledDate: fromPrismaDate(lastIssued.scheduledDate),
              months,
              frequency: parsed.billingFrequency,
              label: "",
            }
          : getCurrentPeriod(parsed.registrationDate, parsed.billingFrequency);

        const upcoming = lastIssued
          ? planFutureInvoicesFrom({
              afterPeriod,
              frequency: parsed.billingFrequency,
              boxQuantity: parsed.boxQuantity,
              monthlyPricePerBox: price,
              horizonEnd: horizonEndDate(todayRome()),
            })
          : planClientInvoices({
              registrationDate: parsed.registrationDate,
              frequency: parsed.billingFrequency,
              boxQuantity: parsed.boxQuantity,
              monthlyPricePerBox: price,
            }).upcoming;

        if (upcoming.length > 0) {
          await tx.invoice.createMany({
            data: upcoming.map((item) => plannedInvoiceCreateData(id, item, userId)),
            skipDuplicates: true,
          });
        }
      } else if (economicsChanged) {
        const toIssue = existing.invoices.filter((invoice) => invoice.status === "TO_ISSUE");
        for (const invoice of toIssue) {
          const amount = calculateInvoiceAmountForFrequency(
            parsed.boxQuantity,
            price,
            parsed.billingFrequency,
          );
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              boxQuantitySnapshot: parsed.boxQuantity,
              monthlyPriceSnapshot: price.toFixed(4),
              monthsSnapshot: parsed.billingFrequency === "QUARTERLY" ? 3 : 6,
              amount: amount.toFixed(2),
              billingFrequency: parsed.billingFrequency,
            },
          });
        }
      }

      return client;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await ensureClientBillingDomain(client.id);
  return client;
}

export async function setClientActive(id: string, active: boolean) {
  return prisma.client.update({
    where: { id },
    data: { active },
  });
}

export async function listClientOptions() {
  return prisma.client.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
