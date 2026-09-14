import { hash } from "bcryptjs";
import { PrismaClient, Prisma } from "@prisma/client";
import { planClientInvoices } from "../src/lib/billing/horizon";
import { toUtcDate } from "../src/lib/dates/calendar-date";
import { plannedInvoiceCreateData } from "../src/server/mappers";

const prisma = new PrismaClient();

const TODAY = "2026-09-14";

async function markIssued(
  clientId: string,
  scheduledDates: string[],
  userId: string,
) {
  for (const scheduledDate of scheduledDates) {
    await prisma.invoice.updateMany({
      where: {
        clientId,
        scheduledDate: toUtcDate(scheduledDate),
        status: "TO_ISSUE",
      },
      data: {
        status: "ISSUED",
        issuedAt: new Date(`${scheduledDate}T08:00:00.000Z`),
        issuedById: userId,
      },
    });
  }
}

async function createDemoClient(
  userId: string,
  data: {
    name: string;
    type: "MUNICIPALITY" | "PRIVATE_OR_BANKRUPTCY";
    taxCode?: string;
    vatNumber?: string;
    notes?: string;
    boxQuantity: number;
    monthlyPricePerBox: string;
    billingFrequency: "QUARTERLY" | "SEMIANNUAL";
    registrationDate: string;
    determina?: string;
    cig?: string;
    commitmentAmount?: string;
    extraIssued?: string[];
    active?: boolean;
  },
) {
  const plan = planClientInvoices({
    registrationDate: data.registrationDate,
    frequency: data.billingFrequency,
    boxQuantity: data.boxQuantity,
    monthlyPricePerBox: data.monthlyPricePerBox,
    today: TODAY,
  });

  const client = await prisma.client.create({
    data: {
      name: data.name,
      type: data.type,
      taxCode: data.taxCode,
      vatNumber: data.vatNumber,
      notes: data.notes,
      boxQuantity: data.boxQuantity,
      monthlyPricePerBox: data.monthlyPricePerBox,
      billingFrequency: data.billingFrequency,
      registrationDate: toUtcDate(data.registrationDate),
      determina: data.determina,
      cig: data.cig,
      commitmentAmount: data.commitmentAmount,
      active: data.active ?? true,
      createdById: userId,
    },
  });

  await prisma.invoice.create({
    data: {
      ...plannedInvoiceCreateData(
        client.id,
        plan.first,
        userId,
        new Date(`${data.registrationDate}T08:00:00.000Z`),
      ),
    } as Prisma.InvoiceUncheckedCreateInput,
  });

  if (plan.upcoming.length > 0) {
    await prisma.invoice.createMany({
      data: plan.upcoming.map((item) => plannedInvoiceCreateData(client.id, item, userId)),
    });
  }

  if (data.extraIssued?.length) {
    await markIssued(client.id, data.extraIssued, userId);
  }

  return client;
}

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@archiviasolution.it").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Archivia2026!";
  const passwordHash = await hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name: "Amministrazione Archivia" },
    create: {
      email,
      name: "Amministrazione Archivia",
      passwordHash,
      role: "ADMIN",
    },
  });

  const existing = await prisma.client.count();
  if (existing > 0) {
    console.log("Dati demo già presenti. Utente admin aggiornato.");
    return;
  }

  await createDemoClient(admin.id, {
    name: "Comune di Bergamo",
    type: "MUNICIPALITY",
    taxCode: "00347920160",
    vatNumber: "00347920160",
    notes: "Deposito storico comunale, via autostrada.",
    boxQuantity: 1200,
    monthlyPricePerBox: "0.35",
    billingFrequency: "QUARTERLY",
    registrationDate: "2026-01-12",
    determina: "Determina n. 14 del 08/01/2026",
    cig: "B8BC170B59",
    commitmentAmount: "15000.00",
    extraIssued: ["2026-04-01", "2026-07-01"],
  });

  await createDemoClient(admin.id, {
    name: "Comune di Brescia",
    type: "MUNICIPALITY",
    taxCode: "00337980170",
    boxQuantity: 800,
    monthlyPricePerBox: "0.50",
    billingFrequency: "QUARTERLY",
    registrationDate: "2026-01-08",
    determina: "Determina n. 3 del 07/01/2026",
    cig: "Z3A19C44D1",
    commitmentAmount: "20000.00",
    extraIssued: ["2026-04-01"],
  });

  await createDemoClient(admin.id, {
    name: "Comune di Seregno",
    type: "MUNICIPALITY",
    taxCode: "00744580964",
    notes: "Impegno quasi esaurito: caso critico per l'amministrazione.",
    boxQuantity: 500,
    monthlyPricePerBox: "1.00",
    billingFrequency: "QUARTERLY",
    registrationDate: "2026-07-10",
    determina: "Determina n. 88 del 02/07/2026",
    cig: "C1D22E90AA",
    commitmentAmount: "2000.00",
  });

  await createDemoClient(admin.id, {
    name: "Comune di Monza",
    type: "MUNICIPALITY",
    taxCode: "00742150152",
    boxQuantity: 400,
    monthlyPricePerBox: "0.45",
    billingFrequency: "QUARTERLY",
    registrationDate: "2026-04-02",
    determina: "Determina n. 41 del 28/03/2026",
    cig: "A9F11B77C2",
    commitmentAmount: "5000.00",
  });

  await createDemoClient(admin.id, {
    name: "Comune di Milano",
    type: "MUNICIPALITY",
    taxCode: "01199250158",
    vatNumber: "01199250158",
    boxQuantity: 2500,
    monthlyPricePerBox: "0.40",
    billingFrequency: "SEMIANNUAL",
    registrationDate: "2026-01-07",
    determina: "Determina n. 102 del 20/12/2025",
    cig: "M1L4N0C1G8",
    commitmentAmount: "50000.00",
  });

  await createDemoClient(admin.id, {
    name: "Fallimento Rossi S.r.l.",
    type: "PRIVATE_OR_BANKRUPTCY",
    vatNumber: "12458960158",
    notes: "Curatore avv. Bianchi. Fatturazione al fallimento.",
    boxQuantity: 350,
    monthlyPricePerBox: "0.60",
    billingFrequency: "QUARTERLY",
    registrationDate: "2026-01-20",
  });

  await createDemoClient(admin.id, {
    name: "Archivio Bianchi",
    type: "PRIVATE_OR_BANKRUPTCY",
    taxCode: "BNCPLA70A01F205X",
    boxQuantity: 90,
    monthlyPricePerBox: "0.80",
    billingFrequency: "SEMIANNUAL",
    registrationDate: "2026-02-15",
  });

  await createDemoClient(admin.id, {
    name: "Studio Legale Ferrari",
    type: "PRIVATE_OR_BANKRUPTCY",
    vatNumber: "08765410965",
    boxQuantity: 120,
    monthlyPricePerBox: "0.55",
    billingFrequency: "QUARTERLY",
    registrationDate: "2026-09-02",
  });

  await createDemoClient(admin.id, {
    name: "Ex Comune di Test",
    type: "MUNICIPALITY",
    boxQuantity: 50,
    monthlyPricePerBox: "0.50",
    billingFrequency: "QUARTERLY",
    registrationDate: "2025-10-03",
    determina: "Determina n. 1 del 01/10/2025",
    cig: "TEST000001",
    commitmentAmount: "3000.00",
    extraIssued: ["2026-01-01", "2026-04-01", "2026-07-01"],
    active: false,
  });

  console.log("Seed completato.");
  console.log(`Admin: ${email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
