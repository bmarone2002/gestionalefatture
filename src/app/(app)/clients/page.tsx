import Link from "next/link";
import { listClients } from "@/server/services/clients";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/forms/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientTypeBadge } from "@/components/status-badges";
import { formatEUR, formatIntegerIT, formatUnitPrice } from "@/lib/money";
import { formatItalianDate } from "@/lib/dates/calendar-date";
import { FREQUENCY_LABELS } from "@/lib/domain/enums";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; frequency?: string; status?: string }>;
}) {
  const params = await searchParams;
  const clients = await listClients({
    q: params.q,
    type: params.type,
    frequency: params.frequency,
    status: params.status ?? "ACTIVE",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clienti</h1>
          <p className="text-sm text-muted-foreground">Anagrafica e condizioni di stoccaggio.</p>
        </div>
        <Link href="/clients/new" className={buttonVariants()}>
          Nuovo cliente
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5">
            <Input name="q" placeholder="Cerca per nome" defaultValue={params.q} />
            <NativeSelect name="type" defaultValue={params.type ?? "ALL"}>
              <option value="ALL">Tutte le tipologie</option>
              <option value="MUNICIPALITY">Comune</option>
              <option value="PRIVATE_OR_BANKRUPTCY">Privato / Fallimento</option>
            </NativeSelect>
            <NativeSelect name="frequency" defaultValue={params.frequency ?? "ALL"}>
              <option value="ALL">Tutte le periodicità</option>
              <option value="QUARTERLY">Trimestrale</option>
              <option value="SEMIANNUAL">Semestrale</option>
            </NativeSelect>
            <NativeSelect name="status" defaultValue={params.status ?? "ACTIVE"}>
              <option value="ALL">Tutti gli stati</option>
              <option value="ACTIVE">Attivi</option>
              <option value="INACTIVE">Non attivi</option>
            </NativeSelect>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Filtra
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipologia</TableHead>
                <TableHead>Scatole</TableHead>
                <TableHead>€/scatola/mese</TableHead>
                <TableHead>Periodicità</TableHead>
                <TableHead>Importo fattura</TableHead>
                <TableHead>Prossima fattura</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <ClientTypeBadge type={client.type} />
                  </TableCell>
                  <TableCell>{formatIntegerIT(client.boxQuantity)}</TableCell>
                  <TableCell>{formatUnitPrice(client.monthlyPricePerBox.toString())}</TableCell>
                  <TableCell>{FREQUENCY_LABELS[client.billingFrequency]}</TableCell>
                  <TableCell>{formatEUR(client.invoiceAmount)}</TableCell>
                  <TableCell>
                    {client.nextInvoiceDate ? formatItalianDate(client.nextInvoiceDate) : "—"}
                  </TableCell>
                  <TableCell>{client.active ? "Attivo" : "Non attivo"}</TableCell>
                  <TableCell>
                    <Link href={`/clients/${client.id}`} className="text-sm underline">
                      Apri
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {clients.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nessun cliente trovato.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
