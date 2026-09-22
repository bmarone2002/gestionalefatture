import { prisma } from "@/server/db";
import { ensureInvoiceHorizon } from "@/server/services/invoices";
import {
  addCalendarMonths,
  todayRome,
  fromUtcDate,
  type CalendarDate,
} from "@/lib/dates/calendar-date";
import { getCurrentPeriod, getNextPeriod } from "@/lib/billing/periods";
import { money } from "@/lib/money";
import { municipalityForecast } from "@/server/commitment";
import { invoiceUrgency } from "@/lib/invoices/urgency";
import { fromPrismaDate } from "@/server/mappers";

export async function getDashboard() {
  try {
    return await loadDashboard();
  } catch (error) {
    console.error("Errore dashboard:", error);
    throw error;
  }
}

async function loadDashboard() {
  const today = todayRome();
  await ensureInvoiceHorizon(today);

  const [activeClients, invoices, municipalities] = await Promise.all([
    prisma.client.count({ where: { active: true } }),
    prisma.invoice.findMany({
      where: { client: { active: true } },
      include: { client: { include: { invoices: true } }, contract: true },
      orderBy: [{ scheduledDate: "asc" }, { client: { name: "asc" } }],
    }),
    prisma.client.findMany({
      where: { active: true, type: "MUNICIPALITY" },
      include: { invoices: true },
    }),
  ]);

  const toIssue = invoices.filter((invoice) => invoice.status === "TO_ISSUE");
  const thisMonthStart = `${today.slice(0, 7)}-01` as CalendarDate;
  const nextMonthStart = addCalendarMonths(thisMonthStart, 1);
  const toIssueThisMonth = toIssue.filter((invoice) => {
    const scheduled = fromPrismaDate(invoice.scheduledDate);
    return scheduled >= thisMonthStart && scheduled < nextMonthStart;
  });
  const amountThisMonth = toIssueThisMonth.reduce(
    (acc, invoice) => acc.plus(money(invoice.amount.toString())),
    money(0),
  );

  const currentQuarter = getCurrentPeriod(today, "QUARTERLY");
  const nextQuarter = getNextPeriod(currentQuarter);
  const nextQuarterAmount = invoices
    .filter((invoice) => {
      const scheduled = fromPrismaDate(invoice.scheduledDate);
      return scheduled >= nextQuarter.start && scheduled <= nextQuarter.end;
    })
    .reduce((acc, invoice) => acc.plus(money(invoice.amount.toString())), money(0));

  const criticalMunicipalities = municipalities
    .map((client) => ({
      client,
      forecast: municipalityForecast(client, client.invoices),
    }))
    .filter((item) => item.forecast?.status === "CRITICAL");

  const mappedToIssue = toIssue.map((invoice) => {
    const scheduled = fromPrismaDate(invoice.scheduledDate);
    const forecast =
      invoice.client.type === "MUNICIPALITY"
        ? municipalityForecast(invoice.client, invoice.client.invoices)
        : null;
    return {
      id: invoice.id,
      clientId: invoice.clientId,
      clientName: invoice.client.name,
      clientType: invoice.client.type,
      periodStart: fromPrismaDate(invoice.periodStart),
      periodEnd: fromPrismaDate(invoice.periodEnd),
      scheduled,
      amount: invoice.amount.toString(),
      status: invoice.status,
      urgency: invoiceUrgency(invoice.status, scheduled, today),
      forecast: forecast ? { status: forecast.status } : null,
      invoiceType: invoice.invoiceType,
      contractName: invoice.contract?.name ?? "Legacy",
    };
  });

  const overdue = mappedToIssue.filter((item) => item.urgency === "OVERDUE");
  const dueToday = mappedToIssue.filter((item) => item.urgency === "TODAY");
  const next7 = mappedToIssue.filter((item) => item.urgency === "WEEK");
  const next30 = mappedToIssue.filter((item) => item.urgency === "MONTH");

  return {
    today,
    kpis: {
      activeClients,
      toIssueCount: toIssue.length,
      toIssueThisMonthCount: toIssueThisMonth.length,
      amountThisMonth: amountThisMonth.toFixed(2),
      nextQuarterAmount: nextQuarterAmount.toFixed(2),
      nextQuarterLabel: nextQuarter.label,
      criticalMunicipalities: criticalMunicipalities.length,
    },
    queues: {
      overdue,
      dueToday,
      next7,
      next30,
    },
    toIssue: mappedToIssue,
    criticalMunicipalities: criticalMunicipalities.map(({ client, forecast }) => ({
      id: client.id,
      name: client.name,
      status: forecast?.status ?? "CRITICAL",
    })),
  };
}

export { fromUtcDate };
