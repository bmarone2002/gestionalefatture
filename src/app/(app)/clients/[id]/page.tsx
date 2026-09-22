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
import { listStandardServices } from "@/server/services/service-catalog";
import { ClientBillingForms } from "@/components/billing/client-billing-forms";
import { CONTRACT_KIND_LABELS, INVOICE_TYPE_LABELS, SERVICE_UNIT_LABELS } from "@/lib/domain/enums";
import { todayRome } from "@/lib/dates/calendar-date";
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
  const [client, standardServices] = await Promise.all([
    getClientById(id),
    listStandardServices(),
  ]);
  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Cliente</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{client.name}</h1>
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

      <div id="servizi" className="scroll-mt-6 space-y-3 border-t border-border/80 pt-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            Contratti e servizi
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">
            Listini, movimentazioni e variazioni
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
            Lo stoccaggio nasce con la registrazione. Qui gestisci il secondo contratto
            (movimentazioni), il listino cliente (START UP, ritiro pratiche, Monitora Doc,
            scansioni, invio originale, macero) e le operazioni da fatturare.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratti e listini attivi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {client.contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun contratto ancora materiale. Se vedi questo messaggio dopo un deploy
              recente, attendi il completamento della migrazione oppure ricarica la pagina.
            </p>
          ) : null}
          {client.contracts.map((contract) => {
            const latestVersion = contract.versions[0];
            const stock = contract.stockMovements.reduce(
              (total, movement) =>
                total + (movement.type === "IN" ? movement.quantity : -movement.quantity),
              0,
            );
            return (
              <div key={contract.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{contract.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {CONTRACT_KIND_LABELS[contract.kind]} · {contract.active ? "Attivo" : "Chiuso"}
                    </div>
                  </div>
                  {contract.kind === "STORAGE" ? (
                    <div className="text-sm font-medium">{formatIntegerIT(stock)} scatole</div>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <Row label="CIG" value={latestVersion?.cig ?? "—"} />
                  <Row
                    label="Impegno"
                    value={latestVersion?.commitmentAmount
                      ? formatEUR(latestVersion.commitmentAmount.toString())
                      : "—"}
                  />
                  <Row
                    label="Validità"
                    value={`${formatItalianDate(fromUtcDate(contract.startDate))} → ${
                      contract.endDate ? formatItalianDate(fromUtcDate(contract.endDate)) : "senza scadenza"
                    }`}
                  />
                </div>
                {contract.clientServices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servizio</TableHead>
                        <TableHead>Unità</TableHead>
                        <TableHead>Prezzo attuale</TableHead>
                        <TableHead>Periodicità</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contract.clientServices.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>{service.serviceDefinition.name}</TableCell>
                          <TableCell>{SERVICE_UNIT_LABELS[service.serviceDefinition.unit]}</TableCell>
                          <TableCell>
                            {service.prices[0]
                              ? formatUnitPrice(service.prices[0].unitPriceVatIncluded.toString())
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {service.billingFrequency
                              ? FREQUENCY_LABELS[service.billingFrequency]
                              : "A richiesta"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Operazioni sul cliente</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggiungi servizi al listino, registra una movimentazione, varia le scatole
            oppure crea un contratto movimentazioni separato con CIG proprio.
          </p>
        </div>
        <ClientBillingForms
          clientId={client.id}
          today={todayRome()}
          isMunicipality={client.type === "MUNICIPALITY"}
          contracts={client.contracts.filter((contract) => contract.active).map((contract) => ({
            id: contract.id,
            name: contract.name,
            kind: contract.kind,
          }))}
          standardServices={standardServices.map((service) => ({
            id: service.id,
            name: service.name,
            unit: service.unit,
          }))}
          clientServices={client.contracts.flatMap((contract) =>
            contract.clientServices.filter((service) => service.active).map((service) => ({
              id: service.serviceDefinition.id,
              clientServiceId: service.id,
              contractId: contract.id,
              code: service.serviceDefinition.code,
              name: service.serviceDefinition.name,
              unit: service.serviceDefinition.unit,
            })),
          )}
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Movimentazioni registrate</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>Totale IVA inclusa</TableHead>
                <TableHead>Fatturazione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.contracts.flatMap((contract) => contract.clientServices)
                .flatMap((service) => service.movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatItalianDate(fromUtcDate(movement.occurredOn))}</TableCell>
                    <TableCell>{service.serviceDefinition.name}</TableCell>
                    <TableCell>{movement.quantity.toString()}</TableCell>
                    <TableCell>{formatEUR(movement.totalVatIncluded.toString())}</TableCell>
                    <TableCell>{movement.invoiceLineId ? "Inclusa" : "Da fatturare"}</TableCell>
                  </TableRow>
                )))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
                <TableHead>Tipo</TableHead>
                <TableHead>Contratto</TableHead>
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
                  <TableCell>{INVOICE_TYPE_LABELS[invoice.invoiceType]}</TableCell>
                  <TableCell>{invoice.contract?.name ?? "Legacy"}</TableCell>
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
