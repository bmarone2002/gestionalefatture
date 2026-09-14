import Link from "next/link";
import { getDashboard } from "@/server/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { formatEUR } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { CommitmentStatusBadge } from "@/components/status-badges";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cosa devo fatturare?</h1>
        <p className="text-sm text-muted-foreground">
          Priorità: scadute, oggi, prossimi 7 giorni, prossimi 30 giorni.
        </p>
      </div>

      <section className="grid gap-4">
        <Queue title="Fatture scadute" rows={data.queues.overdue} today={data.today} tone="critical" />
        <Queue title="Da emettere oggi" rows={data.queues.dueToday} today={data.today} />
        <Queue title="Prossimi 7 giorni" rows={data.queues.next7} today={data.today} />
        <Queue title="Prossimi 30 giorni" rows={data.queues.next30} today={data.today} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Clienti attivi" value={String(data.kpis.activeClients)} />
        <Kpi label="Fatture da emettere" value={String(data.kpis.toIssueCount)} />
        <Kpi label="Da emettere questo mese" value={String(data.kpis.toIssueThisMonthCount)} />
        <Kpi label="Importo da fatturare questo mese" value={formatEUR(data.kpis.amountThisMonth)} />
        <Kpi
          label={`Importo previsto ${data.kpis.nextQuarterLabel}`}
          value={formatEUR(data.kpis.nextQuarterAmount)}
        />
        <Kpi
          label="Comuni con impegno critico"
          value={String(data.kpis.criticalMunicipalities)}
          warn={data.kpis.criticalMunicipalities > 0}
        />
      </section>

      {data.criticalMunicipalities.length > 0 ? (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>Comuni con impegno critico</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.criticalMunicipalities.map(({ client, forecast }) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted"
              >
                <span className="font-medium">{client.name}</span>
                {forecast ? <CommitmentStatusBadge status={forecast.status} /> : null}
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Da emettere</CardTitle>
          <Link href="/invoices?status=TO_ISSUE" className={buttonVariants({ variant: "outline" })}>
            Tutte le fatture
          </Link>
        </CardHeader>
        <CardContent className="px-0">
          <InvoiceTable rows={data.toIssue} today={data.today} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <Card className={warn ? "border-red-300" : undefined}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tabular-nums ${warn ? "text-red-700" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function Queue({
  title,
  rows,
  today,
  tone,
}: {
  title: string;
  rows: React.ComponentProps<typeof InvoiceTable>["rows"];
  today: string;
  tone?: "critical";
}) {
  return (
    <Card className={tone === "critical" && rows.length > 0 ? "border-red-400" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">{rows.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-2 text-sm text-muted-foreground">Nessuna fattura in questa fascia.</p>
        ) : (
          <InvoiceTable rows={rows} today={today} />
        )}
      </CardContent>
    </Card>
  );
}
