import { listInflationPreview } from "@/server/services/istat";
import { IstatManager } from "@/components/billing/istat-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatItalianDate, fromUtcDate, todayRome } from "@/lib/dates/calendar-date";
import { formatUnitPrice, money, roundEuro } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function IstatPage() {
  const previews = await listInflationPreview();

  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Listini</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Adeguamento ISTAT
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          I prezzi sono IVA inclusa. L&apos;anteprima non modifica i listini fino alla conferma.
        </p>
      </div>

      <IstatManager today={todayRome()} pendingIds={previews.map((row) => row.id)} />

      <Card>
        <CardHeader><CardTitle>Anteprima aperta</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contratto</TableHead>
                <TableHead>Servizio</TableHead>
                <TableHead>Decorrenza</TableHead>
                <TableHead>Prezzo attuale</TableHead>
                <TableHead>Nuovo prezzo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previews.flatMap((preview) =>
                preview.contract.clientServices.flatMap((service) => {
                  const current = service.prices[0];
                  if (!current) return [];
                  const adjusted = roundEuro(
                    money(current.unitPriceVatIncluded.toString())
                      .mul(money(1).plus(money(preview.percentage.toString()).div(100))),
                  );
                  return [
                    <TableRow key={`${preview.id}:${service.id}`}>
                      <TableCell>{preview.contract.client.name}</TableCell>
                      <TableCell>{preview.contract.name}</TableCell>
                      <TableCell>{service.serviceDefinition.name}</TableCell>
                      <TableCell>{formatItalianDate(fromUtcDate(preview.effectiveFrom))}</TableCell>
                      <TableCell>{formatUnitPrice(current.unitPriceVatIncluded.toString())}</TableCell>
                      <TableCell>{formatUnitPrice(adjusted)}</TableCell>
                    </TableRow>,
                  ];
                }),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

