import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientById } from "@/server/services/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ClientTypeBadge, InvoiceStatusBadge } from "@/components/status-badges";
import { CommitmentPanel } from "@/components/commitment/commitment-panel";
import { ToggleClientActiveButton } from "@/components/clients/toggle-active-button";
import { formatEUR, formatIntegerIT, formatUnitPrice } from "@/lib/money";
import { formatItalianDate, formatItalianDateTime, fromUtcDate } from "@/lib/dates/calendar-date";
import { FREQUENCY_LABELS } from "@/lib/domain/enums";
import { calculateInvoiceAmountForFrequency } from "@/lib/billing/amounts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <ClientTypeBadge type={client.type} />
            <span className="text-sm text-muted-foreground">
              {client.active ? "Attivo" : "Non attivo"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Modifica
          </Link>
          <ToggleClientActiveButton clientId={client.id} active={client.active} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Anagrafica</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Denominazione" value={client.name} />
            <Row label="Codice fiscale" value={client.taxCode ?? "—"} />
            <Row label="Partita IVA" value={client.vatNumber ?? "—"} />
            <Row label="Note" value={client.notes ?? "—"} />
            <Row label="Registrato il" value={formatItalianDate(fromUtcDate(client.registrationDate))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurazione stoccaggio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Row label="Quantità scatole" value={formatIntegerIT(client.boxQuantity)} />
            <Row
              label="Prezzo mensile/scatola"
              value={formatUnitPrice(client.monthlyPricePerBox.toString())}
            />
            <Row label="Periodicità" value={FREQUENCY_LABELS[client.billingFrequency]} />
            <Row
              label="Importo per fattura"
              value={formatEUR(
                calculateInvoiceAmountForFrequency(
                  client.boxQuantity,
                  client.monthlyPricePerBox.toString(),
                  client.billingFrequency,
                ),
              )}
            />
          </CardContent>
        </Card>
      </div>

      {client.type === "MUNICIPALITY" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Dati amministrativi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row label="Determina" value={client.determina ?? "—"} />
              <Row label="CIG" value={client.cig ?? "—"} />
              <Row
                label="Impegno"
                value={client.commitmentAmount ? formatEUR(client.commitmentAmount.toString()) : "—"}
              />
            </CardContent>
          </Card>
          {client.forecast ? <CommitmentPanel forecast={client.forecast} /> : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Storico fatture</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Data emissione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                      {formatItalianDate(fromUtcDate(invoice.periodStart))} →{" "}
                      {formatItalianDate(fromUtcDate(invoice.periodEnd))}
                    </Link>
                  </TableCell>
                  <TableCell>{formatItalianDate(fromUtcDate(invoice.scheduledDate))}</TableCell>
                  <TableCell>{formatEUR(invoice.amount.toString())}</TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell>
                    {invoice.issuedAt ? formatItalianDateTime(invoice.issuedAt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
