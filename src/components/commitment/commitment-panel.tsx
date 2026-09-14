import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CommitmentStatusBadge } from "@/components/status-badges";
import type { CommitmentForecast } from "@/lib/billing/commitment";
import { formatEUR } from "@/lib/money";
import { formatItalianDate } from "@/lib/dates/calendar-date";

export function CommitmentPanel({ forecast }: { forecast: CommitmentForecast }) {
  const percent = Math.max(0, Math.min(100, forecast.usedPercent));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <CardTitle>Stato impegno</CardTitle>
        <CommitmentStatusBadge status={forecast.status} />
      </CardHeader>
      <CardContent className="grid gap-4">
        <Progress value={percent} className="w-full">
          <span className="text-sm text-muted-foreground">Utilizzo {percent.toFixed(1)}%</span>
        </Progress>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Item label="Impegno iniziale" value={formatEUR(forecast.initial)} />
          <Item label="Utilizzato" value={formatEUR(forecast.used)} />
          <Item label="Residuo" value={formatEUR(forecast.remaining)} />
          <Item label="Prossima fattura" value={formatEUR(forecast.nextInvoiceAmount)} />
          <Item
            label="Fatture ancora finanziabili"
            value={
              Number.isFinite(forecast.fundableInvoiceCount)
                ? String(forecast.fundableInvoiceCount)
                : "—"
            }
          />
          <Item
            label="Esaurimento previsto"
            value={
              forecast.exhaustionDate ? formatItalianDate(forecast.exhaustionDate) : "Non applicabile"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 last:border-0 sm:block sm:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
