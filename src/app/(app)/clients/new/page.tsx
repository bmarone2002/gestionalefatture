import { ClientForm } from "@/components/clients/client-form";
import { todayRome } from "@/lib/dates/calendar-date";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Anagrafica</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Nuovo cliente</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          La registrazione emette automaticamente la prima fattura del periodo corrente.
        </p>
      </div>
      <ClientForm mode="create" today={todayRome()} />
    </div>
  );
}
