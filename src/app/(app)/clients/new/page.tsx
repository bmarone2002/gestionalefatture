import { ClientForm } from "@/components/clients/client-form";
import { todayRome } from "@/lib/dates/calendar-date";
import { listStandardServices } from "@/server/services/service-catalog";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const standardServices = await listStandardServices();

  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Anagrafica</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Nuovo cliente</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Configura anagrafica, stoccaggio e i servizi a listino (scansioni, ritiro,
          invio originale, macero, Monitora Doc, start up o voce libera).
        </p>
      </div>
      <ClientForm
        mode="create"
        today={todayRome()}
        standardServices={standardServices.map((service) => ({
          id: service.id,
          name: service.name,
          unit: service.unit,
        }))}
      />
    </div>
  );
}
