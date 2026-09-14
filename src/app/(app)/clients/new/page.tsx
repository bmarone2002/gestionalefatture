import { ClientForm } from "@/components/clients/client-form";
import { todayRome } from "@/lib/dates/calendar-date";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuovo cliente</h1>
        <p className="text-sm text-muted-foreground">
          La registrazione emette automaticamente la prima fattura del periodo corrente.
        </p>
      </div>
      <ClientForm mode="create" today={todayRome()} />
    </div>
  );
}
