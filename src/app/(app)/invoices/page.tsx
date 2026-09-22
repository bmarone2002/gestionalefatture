import Link from "next/link";
import { listInvoices } from "@/server/services/invoices";
import { listClientOptions } from "@/server/services/clients";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/forms/field";
import { buttonVariants } from "@/components/ui/button";
import { todayRome } from "@/lib/dates/calendar-date";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    range?: string;
    clientId?: string;
    type?: string;
    frequency?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const [invoices, clients] = await Promise.all([
    listInvoices(params),
    listClientOptions(),
  ]);
  const today = todayRome();
  const exportQuery = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/80 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Scadenziario</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Fatture</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Scadenziario di emissione.</p>
        </div>
        <Link
          href={`/api/invoices/export${exportQuery ? `?${exportQuery}` : ""}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Esporta fatture CSV
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtri</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6">
            <NativeSelect name="status" defaultValue={params.status ?? "ALL"}>
              <option value="ALL">Tutte</option>
              <option value="TO_ISSUE">Da emettere</option>
              <option value="ISSUED">Emesse</option>
              <option value="PAID">Pagate</option>
              <option value="OVERDUE">Scadute</option>
            </NativeSelect>
            <NativeSelect name="range" defaultValue={params.range ?? "ALL"}>
              <option value="ALL">Qualsiasi periodo</option>
              <option value="THIS_MONTH">Questo mese</option>
              <option value="NEXT_MONTH">Prossimo mese</option>
            </NativeSelect>
            <NativeSelect name="type" defaultValue={params.type ?? "ALL"}>
              <option value="ALL">Comune e privato</option>
              <option value="MUNICIPALITY">Comune</option>
              <option value="PRIVATE_OR_BANKRUPTCY">Privato / Fallimento</option>
            </NativeSelect>
            <NativeSelect name="frequency" defaultValue={params.frequency ?? "ALL"}>
              <option value="ALL">Tutte le periodicità</option>
              <option value="QUARTERLY">Trimestrale</option>
              <option value="SEMIANNUAL">Semestrale</option>
              <option value="ANNUAL">Annuale</option>
            </NativeSelect>
            <NativeSelect name="clientId" defaultValue={params.clientId ?? ""}>
              <option value="">Tutti i clienti</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </NativeSelect>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>
              Filtra
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0 pt-4">
          <InvoiceTable
            rows={invoices.map((invoice) => ({
              id: invoice.id,
              clientId: invoice.clientId,
              clientName: invoice.client.name,
              clientType: invoice.client.type,
              periodStart: invoice.periodStartDate,
              periodEnd: invoice.periodEndDate,
              scheduled: invoice.scheduled,
              amount: invoice.amount.toString(),
              status: invoice.status,
              urgency: invoice.urgency,
              forecast: invoice.forecast ? { status: invoice.forecast.status } : null,
              invoiceType: invoice.invoiceType,
              contractName: invoice.contract?.name ?? "Legacy",
            }))}
            today={today}
          />
        </CardContent>
      </Card>
    </div>
  );
}
