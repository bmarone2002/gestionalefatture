import { notFound } from "next/navigation";
import { getClientById } from "@/server/services/clients";
import { ClientForm } from "@/components/clients/client-form";
import { fromUtcDate, todayRome } from "@/lib/dates/calendar-date";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
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
      <div className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Anagrafica</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Modifica cliente</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Le fatture già emesse restano invariate. Eventuali modifiche a scatole, prezzo o
          periodicità valgono solo per le scadenze ancora da emettere.
        </p>
      </div>
      <ClientForm
        mode="edit"
        today={todayRome()}
        clientId={client.id}
        initialValues={{
          name: client.name,
          type: client.type,
          taxCode: client.taxCode ?? "",
          vatNumber: client.vatNumber ?? "",
          notes: client.notes ?? "",
          boxQuantity: String(client.boxQuantity),
          monthlyPricePerBox: client.monthlyPricePerBox.toString().replace(".", ","),
          billingFrequency: client.billingFrequency,
          registrationDate: fromUtcDate(client.registrationDate),
          determina: client.determina ?? "",
          cig: client.cig ?? "",
          commitmentAmount: client.commitmentAmount
            ? client.commitmentAmount.toString().replace(".", ",")
            : "",
        }}
      />
    </div>
  );
}
