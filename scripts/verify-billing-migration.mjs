import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

try {
  const [clientCount, storageContractCount, invoices] = await Promise.all([
    prisma.client.count(),
    prisma.contract.count({ where: { kind: "STORAGE" } }),
    prisma.invoice.findMany({
      include: { lines: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const failures = [];
  if (storageContractCount < clientCount) {
    failures.push(
      `Contratti stoccaggio insufficienti: ${storageContractCount}/${clientCount}`,
    );
  }

  for (const invoice of invoices) {
    if (!invoice.contractId) failures.push(`Fattura ${invoice.id}: contratto mancante`);
    if (invoice.lines.length === 0) failures.push(`Fattura ${invoice.id}: righe mancanti`);
    const lineTotal = invoice.lines.reduce(
      (sum, line) => sum.plus(line.amountVatIncluded.toString()),
      new Decimal(0),
    );
    if (!lineTotal.eq(invoice.amount.toString())) {
      failures.push(
        `Fattura ${invoice.id}: totale ${invoice.amount} != righe ${lineTotal.toFixed(2)}`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("Riconciliazione billing fallita:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Riconciliazione completata: ${clientCount} clienti, ${storageContractCount} contratti stoccaggio, ${invoices.length} documenti.`,
    );
  }
} catch (error) {
  console.error(
    `Riconciliazione non eseguita: ${error instanceof Error ? error.message.split("\n").filter(Boolean).at(-1) : String(error)}`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

