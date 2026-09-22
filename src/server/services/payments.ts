import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { paymentSchema } from "@/lib/validation/billing";
import { parseItalianDecimal, money, roundEuro } from "@/lib/money";
import { toPrismaDate } from "@/server/mappers";

export async function recordPayment(rawInput: unknown, userId: string) {
  const input = paymentSchema.parse(rawInput);
  const amount = parseItalianDecimal(input.amount);
  if (!amount.isPositive()) throw new Error("L'importo deve essere maggiore di zero");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${input.invoiceId} FOR UPDATE`;
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new Error("Documento non trovato");
    if (invoice.status !== "ISSUED" && invoice.status !== "PAID") {
      throw new Error("È possibile registrare pagamenti solo su documenti emessi");
    }
    const target = money(invoice.amount.toString()).abs();
    const alreadyPaid = invoice.payments.reduce(
      (sum, payment) => sum.plus(payment.amount.toString()),
      money(0),
    );
    if (alreadyPaid.plus(amount).greaterThan(target)) {
      throw new Error(
        `Il pagamento supera il residuo di ${roundEuro(target.minus(alreadyPaid)).toFixed(2)} €`,
      );
    }
    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        paidAt: toPrismaDate(input.paidAt),
        amount: amount.toFixed(2),
        notes: input.notes,
        recordedById: userId,
      },
    });
    if (alreadyPaid.plus(amount).greaterThanOrEqualTo(target)) {
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID" } });
    }
    return payment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

