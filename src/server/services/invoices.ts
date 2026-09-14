import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  horizonEndDate,
  planFutureInvoicesFrom,
} from "@/lib/billing/horizon";
import { fromPrismaDate, plannedInvoiceCreateData } from "@/server/mappers";
import { todayRome, addCalendarMonths, type CalendarDate } from "@/lib/dates/calendar-date";
import { InsufficientCommitmentError } from "@/lib/billing/commitment";
import { assertMunicipalityCanIssue, municipalityForecast } from "@/server/commitment";
import { invoiceUrgency } from "@/lib/invoices/urgency";
import { getCurrentPeriod, getNextPeriod } from "@/lib/billing/periods";

export async function getNavAlertCount() {
  const today = todayRome();
  return prisma.invoice.count({
    where: {
      status: "TO_ISSUE",
      scheduledDate: { lte: new Date(`${today}T00:00:00.000Z`) },
      client: { active: true },
    },
  });
}

export async function ensureInvoiceHorizon(today: CalendarDate = todayRome()) {
  const horizonEnd = horizonEndDate(today);
  const clients = await prisma.client.findMany({
    where: { active: true },
    include: {
      invoices: { orderBy: { periodStart: "desc" }, take: 1 },
    },
  });

  for (const client of clients) {
    const last = client.invoices[0];
    if (!last) {
      continue;
    }
    const upcoming = planFutureInvoicesFrom({
      afterPeriod: {
        start: fromPrismaDate(last.periodStart),
        end: fromPrismaDate(last.periodEnd),
        scheduledDate: fromPrismaDate(last.scheduledDate),
        months: last.monthsSnapshot === 6 ? 6 : 3,
        frequency: client.billingFrequency,
        label: "",
      },
      frequency: client.billingFrequency,
      boxQuantity: client.boxQuantity,
      monthlyPricePerBox: client.monthlyPricePerBox.toString(),
      horizonEnd,
    });
    if (upcoming.length === 0) {
      continue;
    }
    await prisma.invoice.createMany({
      data: upcoming.map((item) => plannedInvoiceCreateData(client.id, item, client.createdById)),
      skipDuplicates: true,
    });
  }
}

export async function listInvoices(filters: {
  status?: string;
  range?: string;
  clientId?: string;
  type?: string;
  frequency?: string;
  q?: string;
}) {
  const today = todayRome();
  const where: Prisma.InvoiceWhereInput = {
    client: {
      active: filters.status === "ISSUED" ? undefined : true,
    },
  };

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }
  if (filters.type && filters.type !== "ALL" && where.client) {
    where.client.type = filters.type as Prisma.ClientWhereInput["type"];
  }
  if (filters.frequency && filters.frequency !== "ALL") {
    where.billingFrequency =
      filters.frequency as Prisma.InvoiceWhereInput["billingFrequency"];
  }
  if (filters.q && where.client) {
    where.client.name = { contains: filters.q, mode: "insensitive" };
  }

  if (filters.status === "TO_ISSUE" || filters.status === "ISSUED") {
    where.status = filters.status;
  } else if (filters.status === "OVERDUE") {
    where.status = "TO_ISSUE";
    where.scheduledDate = { lt: toDate(today) };
  }

  if (filters.range === "THIS_MONTH") {
    const start = monthStart(today);
    const end = addCalendarMonths(start, 1);
    where.scheduledDate = {
      gte: toDate(start),
      lt: toDate(end),
    };
  } else if (filters.range === "NEXT_MONTH") {
    const start = addCalendarMonths(monthStart(today), 1);
    const end = addCalendarMonths(start, 1);
    where.scheduledDate = {
      gte: toDate(start),
      lt: toDate(end),
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: {
        include: {
          invoices: true,
        },
      },
    },
    orderBy: [{ scheduledDate: "asc" }, { client: { name: "asc" } }],
  });

  return invoices.map((invoice) => ({
    ...invoice,
    periodStartDate: fromPrismaDate(invoice.periodStart),
    periodEndDate: fromPrismaDate(invoice.periodEnd),
    scheduled: fromPrismaDate(invoice.scheduledDate),
    urgency: invoiceUrgency(invoice.status, fromPrismaDate(invoice.scheduledDate), today),
    forecast: municipalityForecast(invoice.client, invoice.client.invoices),
  }));
}

export async function getInvoiceById(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { include: { invoices: true } },
      issuedBy: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });
  if (!invoice) {
    return null;
  }
  const today = todayRome();
  return {
    ...invoice,
    periodStartDate: fromPrismaDate(invoice.periodStart),
    periodEndDate: fromPrismaDate(invoice.periodEnd),
    scheduled: fromPrismaDate(invoice.scheduledDate),
    urgency: invoiceUrgency(invoice.status, fromPrismaDate(invoice.scheduledDate), today),
    forecast: municipalityForecast(invoice.client, invoice.client.invoices),
  };
}

export async function issueInvoice(id: string, userId: string) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({
          where: { id },
          include: { client: { include: { invoices: true } } },
        });
        if (!invoice) {
          throw new Error("Fattura non trovata");
        }
        if (invoice.status !== "TO_ISSUE") {
          throw new Error("La fattura risulta già emessa");
        }
        if (!invoice.client.active) {
          throw new Error("Il cliente non è attivo");
        }

        await tx.$queryRaw`SELECT id FROM "Client" WHERE id = ${invoice.clientId} FOR UPDATE`;

        const latestInvoices = await tx.invoice.findMany({
          where: { clientId: invoice.clientId },
        });
        assertMunicipalityCanIssue(invoice.client, latestInvoices, invoice.amount.toString());

        const updated = await tx.invoice.updateMany({
          where: { id, status: "TO_ISSUE" },
          data: {
            status: "ISSUED",
            issuedAt: new Date(),
            issuedById: userId,
          },
        });
        if (updated.count !== 1) {
          throw new Error("La fattura risulta già emessa");
        }

        return tx.invoice.findUniqueOrThrow({ where: { id } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof InsufficientCommitmentError) {
      throw error;
    }
    throw error;
  }
}

export async function listInvoicesForExport(filters: Parameters<typeof listInvoices>[0]) {
  return listInvoices(filters);
}

function toDate(date: CalendarDate) {
  return new Date(`${date}T00:00:00.000Z`);
}

function monthStart(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 7)}-01`;
}

export function nextPeriodAfter(date: CalendarDate, frequency: "QUARTERLY" | "SEMIANNUAL") {
  return getNextPeriod(getCurrentPeriod(date, frequency));
}
