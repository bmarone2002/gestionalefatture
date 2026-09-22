import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceById } from "@/server/services/invoices";
import { listStandardServices } from "@/server/services/service-catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientTypeBadge, InvoiceStatusBadge, UrgencyBadge } from "@/components/status-badges";
import { IssueInvoiceButton } from "@/components/invoices/issue-invoice-button";
import { InvoiceServiceComposer } from "@/components/invoices/invoice-service-composer";
import { CommitmentPanel } from "@/components/commitment/commitment-panel";
import { formatEUR, formatIntegerIT, formatUnitPrice, money } from "@/lib/money";
import { formatItalianDate, formatItalianDateTime, todayRome } from "@/lib/dates/calendar-date";
import {
  FREQUENCY_LABELS,
  INVOICE_TYPE_LABELS,
  SERVICE_UNIT_LABELS,
} from "@/lib/domain/enums";
import { PaymentForm } from "@/components/billing/payment-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, standardServices] = await Promise.all([
    getInvoiceById(id),
    listStandardServices(),
  ]);
  if (!invoice) {
    notFound();
  }
  const today = todayRome();
  const remaining = invoice.forecast?.remaining;
  const canCover =
    remaining == null || remaining.gte(invoice.amount.toString());
  const canIssue =
    invoice.status === "TO_ISSUE" && invoice.client.active && canCover;
  const difference =
    remaining != null ? remaining.minus(invoice.amount.toString()) : undefined;
  const paidTotal = invoice.payments.reduce(
    (sum, payment) => sum.plus(payment.amount.toString()),
    money(0),
  );
  const paymentRemaining = money(invoice.amount.toString()).abs().minus(paidTotal);

  const pricedByDefinition = new Map(
    invoice.client.clientServices.map((service) => [
      service.serviceDefinitionId,
      service.prices[0]?.unitPriceVatIncluded.toString(),
    ]),
  );
  const catalog = [
    ...standardServices.map((service) => ({
      id: service.id,
      name: service.name,
      unit: service.unit,
      suggestedPrice: pricedByDefinition.get(service.id),
    })),
    ...invoice.client.clientServices
      .filter(
        (service) =>
          service.serviceDefinition.code == null &&
          !standardServices.some((item) => item.id === service.serviceDefinitionId),
      )
      .map((service) => ({
        id: service.serviceDefinition.id,
        name: service.serviceDefinition.name,
        unit: service.serviceDefinition.unit,
        suggestedPrice: service.prices[0]?.unitPriceVatIncluded.toString(),
      })),
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Fattura</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {invoice.client.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {formatItalianDate(invoice.periodStartDate)} → {formatItalianDate(invoice.periodEndDate)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          <UrgencyBadge urgency={invoice.urgency} scheduledDate={invoice.scheduled} today={today} />
          <ClientTypeBadge type={invoice.client.type} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dettaglio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row
              label="Cliente"
              value={
                <Link href={`/clients/${invoice.clientId}`} className="underline">
                  {invoice.client.name}
                </Link>
              }
            />
            <Row label="Scadenza" value={formatItalianDate(invoice.scheduled)} />
            <Row label="Tipo documento" value={INVOICE_TYPE_LABELS[invoice.invoiceType]} />
            <Row label="Contratto" value={invoice.contract?.name ?? "Legacy"} />
            <Row label="CIG" value={invoice.contractVersion?.cig ?? "—"} />
            <Row label="Periodicità" value={FREQUENCY_LABELS[invoice.billingFrequency]} />
            <Row label="Scatole (storico)" value={formatIntegerIT(invoice.boxQuantitySnapshot)} />
            <Row
              label="Prezzo (storico)"
              value={formatUnitPrice(invoice.monthlyPriceSnapshot.toString())}
            />
            <Row label="Mesi" value={String(invoice.monthsSnapshot)} />
            <Row label="Importo" value={formatEUR(invoice.amount.toString())} />
            <Row
              label="Emessa il"
              value={invoice.issuedAt ? formatItalianDateTime(invoice.issuedAt) : "—"}
            />
            <Row label="Emessa da" value={invoice.issuedBy?.name ?? "—"} />
            <Row label="Numero esterno" value={invoice.externalNumber ?? "—"} />
            <Row
              label="Data documento esterno"
              value={invoice.externalDate
                ? formatItalianDate(invoice.externalDate.toISOString().slice(0, 10))
                : "—"}
            />
          </CardContent>
        </Card>

        {invoice.status === "TO_ISSUE" ? (
          <Card>
            <CardHeader>
              <CardTitle>Passo 2 — Emissione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Controlla le voci sotto, poi registra numero e data del documento
                emesso nel gestionale contabile.
              </p>
              <IssueInvoiceButton
                invoiceId={invoice.id}
                amount={invoice.amount.toString()}
                canIssue={canIssue}
                remaining={remaining?.toFixed(2)}
                difference={difference?.toFixed(2)}
                today={today}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Emissione</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Questa fattura è già stata emessa e non può essere modificata.
            </CardContent>
          </Card>
        )}
      </div>

      {invoice.forecast ? <CommitmentPanel forecast={invoice.forecast} /> : null}

      {invoice.status === "TO_ISSUE" ? (
        <Card>
          <CardHeader>
            <CardTitle>Preparazione documento</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceServiceComposer
              invoiceId={invoice.id}
              catalog={catalog}
              lines={invoice.lines.map((line) => ({
                id: line.id,
                description: line.description,
                quantity: line.quantity.toString(),
                unit: line.unit,
                unitPrice: line.unitPriceVatIncluded.toString(),
                amount: line.amountVatIncluded.toString(),
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Voci del documento</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrizione</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>Unità</TableHead>
                <TableHead>Prezzo IVA inclusa</TableHead>
                <TableHead>Importo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.quantity.toString()}</TableCell>
                  <TableCell>{SERVICE_UNIT_LABELS[line.unit]}</TableCell>
                  <TableCell>{formatUnitPrice(line.unitPriceVatIncluded.toString())}</TableCell>
                  <TableCell>{formatEUR(line.amountVatIncluded.toString())}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.status === "ISSUED" || invoice.status === "PAID" ? (
        <Card>
          <CardHeader><CardTitle>Pagamenti</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {invoice.payments.map((payment) => (
              <Row
                key={payment.id}
                label={formatItalianDate(payment.paidAt.toISOString().slice(0, 10))}
                value={formatEUR(payment.amount.toString())}
              />
            ))}
            {invoice.status !== "PAID" && paymentRemaining.isPositive() ? (
              <PaymentForm
                invoiceId={invoice.id}
                today={today}
                remaining={paymentRemaining.toFixed(2)}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
