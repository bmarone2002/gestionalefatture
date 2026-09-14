"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, NativeSelect } from "@/components/forms/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClientAction, updateClientAction } from "@/server/actions";
import { formatInvoicePreview } from "@/lib/billing/amounts";
import { planClientInvoices } from "@/lib/billing/horizon";
import { remainingCommitment } from "@/lib/billing/commitment";
import { formatEUR, parseItalianDecimal } from "@/lib/money";
import { formatItalianDate } from "@/lib/dates/calendar-date";
import type { BillingFrequency, ClientType } from "@/lib/domain/enums";
import { FREQUENCY_LABELS, CLIENT_TYPE_LABELS } from "@/lib/domain/enums";

export type ClientFormValues = {
  name: string;
  type: ClientType;
  taxCode: string;
  vatNumber: string;
  notes: string;
  boxQuantity: string;
  monthlyPricePerBox: string;
  billingFrequency: BillingFrequency;
  registrationDate: string;
  determina: string;
  cig: string;
  commitmentAmount: string;
};

const emptyValues = (today: string): ClientFormValues => ({
  name: "",
  type: "MUNICIPALITY",
  taxCode: "",
  vatNumber: "",
  notes: "",
  boxQuantity: "",
  monthlyPricePerBox: "",
  billingFrequency: "QUARTERLY",
  registrationDate: today,
  determina: "",
  cig: "",
  commitmentAmount: "",
});

export function ClientForm({
  mode,
  today,
  clientId,
  initialValues,
}: {
  mode: "create" | "edit";
  today: string;
  clientId?: string;
  initialValues?: Partial<ClientFormValues>;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [values, setValues] = useState<ClientFormValues>({
    ...emptyValues(today),
    ...initialValues,
  });

  const isMunicipality = values.type === "MUNICIPALITY";
  const steps = isMunicipality
    ? ["Cliente", "Servizio", "Dati Comune", "Riepilogo"]
    : ["Cliente", "Servizio", "Riepilogo"];
  const lastStep = steps.length - 1;

  const preview = useMemo(() => {
    const quantity = Number(values.boxQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return null;
    }
    try {
      const price = parseItalianDecimal(values.monthlyPricePerBox);
      if (price.isNegative()) return null;
      const plan = planClientInvoices({
        registrationDate: values.registrationDate,
        frequency: values.billingFrequency,
        boxQuantity: quantity,
        monthlyPricePerBox: price,
        today,
      });
      const commitment = isMunicipality && values.commitmentAmount
        ? parseItalianDecimal(values.commitmentAmount)
        : null;
      const remaining =
        commitment != null ? remainingCommitment(commitment, plan.first.amount) : null;
      return {
        formula: formatInvoicePreview(quantity, price, values.billingFrequency),
        amount: plan.first.amount,
        first: plan.first,
        next: plan.nextScheduledDate,
        remaining,
        commitment,
      };
    } catch {
      return null;
    }
  }, [values, isMunicipality, today]);

  function update<K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit() {
    setPending(true);
    setError(null);
    const payload = {
      ...values,
      boxQuantity: Number(values.boxQuantity),
      taxCode: values.taxCode || undefined,
      vatNumber: values.vatNumber || undefined,
      notes: values.notes || undefined,
      determina: isMunicipality ? values.determina : undefined,
      cig: isMunicipality ? values.cig : undefined,
      commitmentAmount: isMunicipality ? values.commitmentAmount : undefined,
    };
    const result =
      mode === "create"
        ? await createClientAction(payload)
        : await updateClientAction(clientId!, payload);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    router.push(`/clients/${result.data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex gap-2 text-sm">
        {steps.map((label, index) => (
          <li
            key={label}
            className={
              index === step
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }
          >
            {index + 1}. {label}
            {index < lastStep ? <span className="mx-2 text-muted-foreground">/</span> : null}
          </li>
        ))}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step]}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {step === 0 ? (
            <>
              <Field label="Denominazione" htmlFor="name" error={fieldErrors.name?.[0]}>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </Field>
              <Field label="Tipologia" htmlFor="type">
                <NativeSelect
                  id="type"
                  value={values.type}
                  onChange={(event) => update("type", event.target.value as ClientType)}
                >
                  <option value="MUNICIPALITY">Comune</option>
                  <option value="PRIVATE_OR_BANKRUPTCY">Privato / Fallimento</option>
                </NativeSelect>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Codice fiscale" htmlFor="taxCode">
                  <Input
                    id="taxCode"
                    value={values.taxCode}
                    onChange={(event) => update("taxCode", event.target.value)}
                  />
                </Field>
                <Field label="Partita IVA" htmlFor="vatNumber">
                  <Input
                    id="vatNumber"
                    value={values.vatNumber}
                    onChange={(event) => update("vatNumber", event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Note" htmlFor="notes">
                <Textarea
                  id="notes"
                  value={values.notes}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </Field>
              <Field
                label="Data di registrazione"
                htmlFor="registrationDate"
                hint={
                  mode === "create"
                    ? "La registrazione emette automaticamente la prima fattura del periodo corrente."
                    : "La data di registrazione non modifica le fatture già emesse."
                }
              >
                <Input
                  id="registrationDate"
                  type="date"
                  value={values.registrationDate}
                  disabled={mode === "edit"}
                  onChange={(event) => update("registrationDate", event.target.value)}
                />
              </Field>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <Field label="Quantità scatole" htmlFor="boxQuantity" error={fieldErrors.boxQuantity?.[0]}>
                <Input
                  id="boxQuantity"
                  inputMode="numeric"
                  value={values.boxQuantity}
                  onChange={(event) => update("boxQuantity", event.target.value)}
                />
              </Field>
              <Field
                label="Prezzo mensile per scatola (€)"
                htmlFor="monthlyPricePerBox"
                hint="Esempio: 0,50"
                error={fieldErrors.monthlyPricePerBox?.[0]}
              >
                <Input
                  id="monthlyPricePerBox"
                  value={values.monthlyPricePerBox}
                  onChange={(event) => update("monthlyPricePerBox", event.target.value)}
                />
              </Field>
              <Field label="Periodicità" htmlFor="billingFrequency">
                <NativeSelect
                  id="billingFrequency"
                  value={values.billingFrequency}
                  onChange={(event) =>
                    update("billingFrequency", event.target.value as BillingFrequency)
                  }
                >
                  <option value="QUARTERLY">Trimestrale</option>
                  <option value="SEMIANNUAL">Semestrale</option>
                </NativeSelect>
              </Field>
              <div className="rounded-lg bg-muted px-3 py-3 text-sm">
                <div className="text-muted-foreground">Importo previsto per ogni fattura</div>
                <div className="mt-1 font-medium">
                  {preview ? preview.formula : "Inserire quantità, prezzo e periodicità"}
                </div>
              </div>
            </>
          ) : null}

          {isMunicipality && step === 2 ? (
            <>
              <Field label="Determina" htmlFor="determina" error={fieldErrors.determina?.[0]}>
                <Input
                  id="determina"
                  value={values.determina}
                  onChange={(event) => update("determina", event.target.value)}
                  placeholder="Determina n. 20 del 18/05/2026"
                />
              </Field>
              <Field label="CIG" htmlFor="cig" error={fieldErrors.cig?.[0]}>
                <Input
                  id="cig"
                  value={values.cig}
                  onChange={(event) => update("cig", event.target.value)}
                />
              </Field>
              <Field
                label="Importo impegno (€)"
                htmlFor="commitmentAmount"
                error={fieldErrors.commitmentAmount?.[0]}
              >
                <Input
                  id="commitmentAmount"
                  value={values.commitmentAmount}
                  onChange={(event) => update("commitmentAmount", event.target.value)}
                />
              </Field>
            </>
          ) : null}

          {step === lastStep && preview ? (
            <div className="grid gap-3 text-sm">
              <SummaryRow label="Cliente" value={values.name || "—"} />
              <SummaryRow label="Tipologia" value={CLIENT_TYPE_LABELS[values.type]} />
              <SummaryRow label="Scatole" value={values.boxQuantity} />
              <SummaryRow
                label="Prezzo"
                value={values.monthlyPricePerBox ? `€ ${values.monthlyPricePerBox}` : "—"}
              />
              <SummaryRow label="Periodicità" value={FREQUENCY_LABELS[values.billingFrequency]} />
              <SummaryRow
                label="Periodo prima fattura"
                value={`${formatItalianDate(preview.first.periodStart)} → ${formatItalianDate(preview.first.periodEnd)}`}
              />
              <SummaryRow label="Importo prima fattura" value={formatEUR(preview.amount)} />
              <SummaryRow
                label="Prossima scadenza"
                value={preview.next ? formatItalianDate(preview.next) : "—"}
              />
              {isMunicipality && preview.commitment ? (
                <>
                  <SummaryRow label="Impegno iniziale" value={formatEUR(preview.commitment)} />
                  <SummaryRow label="Prima fattura" value={formatEUR(preview.amount)} />
                  <SummaryRow
                    label="Residuo iniziale dopo registrazione"
                    value={formatEUR(preview.remaining ?? 0)}
                  />
                </>
              ) : null}
              {mode === "create" ? (
                <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
                  Confermando, la prima fattura verrà registrata come già emessa.
                </p>
              ) : (
                <p className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
                  Le fatture già emesse non verranno ricalcolate.
                </p>
              )}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || pending}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              Indietro
            </Button>
            {step < lastStep ? (
              <Button type="button" onClick={() => setStep((current) => current + 1)}>
                Avanti
              </Button>
            ) : (
              <Button type="button" disabled={pending || !preview} onClick={onSubmit}>
                {pending
                  ? "Salvataggio…"
                  : mode === "create"
                    ? "Conferma registrazione"
                    : "Salva modifiche"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
