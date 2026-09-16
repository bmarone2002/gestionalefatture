import Link from "next/link";
import { getDashboard } from "@/server/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { formatEUR } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { CommitmentStatusBadge } from "@/components/status-badges";
import { cn } from "cn";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboard();

  return (
    <div className="space-y-8">
      <header className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Operatività</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Cosa devo fatturare?
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Priorità: scadute, oggi, prossimi 7 giorni, prossimi 30 giorni.
        </p>
      </header>

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
        <Card className="border-red-200/90 ring-red-200/60">
          <CardHeader>
            <CardTitle>Comuni con impegno critico</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            {data.criticalMunicipalities.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2.5 transition-colors hover:bg-muted"
              >
                <span className="font-medium">{client.name}</span>
                <CommitmentStatusBadge status={client.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
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
    <Card
      className={cn(
        "relative overflow-hidden",
        warn && "border-red-300/90 ring-red-200/70",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          warn ? "bg-red-500" : "bg-brand",
        )}
      />
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-semibold tabular-nums tracking-tight", warn && "text-red-700")}>
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
  const critical = tone === "critical" && rows.length > 0;

  return (
    <Card className={cn(critical && "border-red-400/90 ring-red-200/80")}>
      <CardHeader className="border-b border-border/60">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            {critical ? <span className="size-2 rounded-sm bg-red-500" aria-hidden /> : null}
            {title}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums",
              critical ? "bg-red-50 text-red-700" : "bg-muted text-muted-foreground",
            )}
          >
            {rows.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">Nessuna fattura in questa fascia.</p>
        ) : (
          <InvoiceTable rows={rows} today={today} />
        )}
      </CardContent>
    </Card>
  );
}
