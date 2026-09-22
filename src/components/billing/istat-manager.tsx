"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import {
  confirmInflationAdjustmentsAction,
  createInflationPreviewAction,
} from "@/server/actions/billing";

export function IstatManager({
  today,
  pendingIds,
}: {
  today: string;
  pendingIds: string[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setPending(true);
          const result = await createInflationPreviewAction({
            percentage: data.get("percentage"),
            effectiveFrom: data.get("effectiveFrom"),
          });
          setPending(false);
          setMessage(result.ok ? `Anteprima creata per ${result.data.count} contratti.` : result.error);
          router.refresh();
        }}
      >
        <Field label="Percentuale ISTAT" htmlFor="istat-percentage">
          <Input id="istat-percentage" name="percentage" inputMode="decimal" required />
        </Field>
        <Field label="Data decorrenza" htmlFor="istat-effective">
          <Input id="istat-effective" name="effectiveFrom" type="date" defaultValue={today} required />
        </Field>
        <Button className="self-end" disabled={pending}>Genera anteprima</Button>
      </form>
      {message ? <p className="text-sm">{message}</p> : null}
      {pendingIds.length > 0 ? (
        <Button
          className="w-fit"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await confirmInflationAdjustmentsAction(pendingIds);
            setPending(false);
            setMessage(result.ok ? `${result.data.count} adeguamenti confermati.` : result.error);
            router.refresh();
          }}
        >
          Conferma tutti gli adeguamenti
        </Button>
      ) : null}
    </div>
  );
}

