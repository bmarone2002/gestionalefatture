"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { recordPaymentAction } from "@/server/actions/billing";

export function PaymentForm({
  invoiceId,
  today,
  remaining,
}: {
  invoiceId: string;
  today: string;
  remaining: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setPending(true);
        setError(null);
        const result = await recordPaymentAction({
          invoiceId,
          paidAt: data.get("paidAt"),
          amount: data.get("amount"),
          notes: data.get("notes") || undefined,
        });
        setPending(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        form.reset();
        router.refresh();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Data pagamento" htmlFor="paidAt">
          <Input id="paidAt" name="paidAt" type="date" defaultValue={today} required />
        </Field>
        <Field label="Importo incassato" htmlFor="paymentAmount">
          <Input id="paymentAmount" name="amount" defaultValue={remaining} inputMode="decimal" required />
        </Field>
      </div>
      <Field label="Note" htmlFor="paymentNotes">
        <Input id="paymentNotes" name="notes" />
      </Field>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button disabled={pending}>{pending ? "Registrazione…" : "Registra pagamento"}</Button>
    </form>
  );
}

