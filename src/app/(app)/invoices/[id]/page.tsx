import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceById } from "@/server/services/invoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientTypeBadge, InvoiceStatusBadge, UrgencyBadge } from "@/components/status-badges";
import { IssueInvoiceButton } from "@/components/invoices/issue-invoice-button";
import { CommitmentPanel } from "@/components/commitment/commitment-panel";
import { formatEUR, formatIntegerIT, formatUnitPrice } from "@/lib/money";
import { formatItalianDate, formatItalianDateTime } from "@/lib/dates/calendar-date";
import { FREQUENCY_LABELS } from "@/lib/domain/enums";
import { todayRome } from "@/lib/dates/calendar-date";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
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
          </CardContent>
        </Card>

        {invoice.status === "TO_ISSUE" ? (
          <Card>
            <CardHeader>
              <CardTitle>Emissione</CardTitle>
            </CardHeader>
            <CardContent>
              <IssueInvoiceButton
                invoiceId={invoice.id}
                amount={invoice.amount.toString()}
                canIssue={canIssue}
                remaining={remaining?.toFixed(2)}
                difference={difference?.toFixed(2)}
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
