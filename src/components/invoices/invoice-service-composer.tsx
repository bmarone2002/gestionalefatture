"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/field";
import {
  addInvoiceServiceLineAction,
  removeInvoiceServiceLineAction,
} from "@/server/actions/billing";
import { formatEUR, formatUnitPrice } from "@/lib/money";
import { SERVICE_UNIT_LABELS, type ServiceUnit } from "@/lib/domain/enums";

type CatalogService = {
  id: string;
  name: string;
  unit: ServiceUnit;
  suggestedPrice?: string;
};

type InvoiceLine = {
  id: string;
  description: string;
  quantity: string;
  unit: ServiceUnit;
  unitPrice: string;
  amount: string;
};

export function InvoiceServiceComposer({
  invoiceId,
  catalog,
  lines,
}: {
  invoiceId: string;
  catalog: CatalogService[];
  lines: InvoiceLine[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"CATALOG" | "CUSTOM">("CATALOG");
  const [serviceId, setServiceId] = useState(catalog[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(catalog[0]?.suggestedPrice ?? "");
  const [total, setTotal] = useState("");

  const selected = useMemo(
    () => catalog.find((service) => service.id === serviceId),
    [catalog, serviceId],
  );

  async function addLine() {
    setPending(true);
    setError(null);
    const result = await addInvoiceServiceLineAction({
      invoiceId,
      mode,
      serviceDefinitionId: mode === "CATALOG" ? serviceId : undefined,
      description: mode === "CUSTOM" ? description : undefined,
      quantity: Number(quantity),
      unit: mode === "CUSTOM" ? "FIXED" : selected?.unit,
      unitPrice: unitPrice || undefined,
      total: total || undefined,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuantity("1");
    setTotal("");
    if (mode === "CUSTOM") setDescription("");
    router.refresh();
  }

  async function removeLine(lineId: string) {
    setPending(true);
    setError(null);
    const result = await removeInvoiceServiceLineAction(lineId, invoiceId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-brand/30 bg-accent/40 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Passo 1 — Aggiungi servizi</p>
        <p className="mt-1 text-muted-foreground">
          Scegli dal catalogo oppure inserisci una voce libera. Poi, al passo 2,
          emetti il documento con numero e data del gestionale contabile.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant={mode === "CATALOG" ? "default" : "outline"}
          onClick={() => setMode("CATALOG")}
        >
          Dal catalogo
        </Button>
        <Button
          type="button"
          variant={mode === "CUSTOM" ? "default" : "outline"}
          onClick={() => setMode("CUSTOM")}
        >
          Voce libera
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "CATALOG" ? (
          <Field label="Servizio" htmlFor="invoice-service">
            <NativeSelect
              id="invoice-service"
              value={serviceId}
              onChange={(event) => {
                const next = event.target.value;
                setServiceId(next);
                const match = catalog.find((service) => service.id === next);
                if (match?.suggestedPrice) setUnitPrice(match.suggestedPrice);
              }}
            >
              {catalog.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                  {service.suggestedPrice
                    ? ` · ${formatUnitPrice(service.suggestedPrice)}`
                    : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : (
          <Field label="Descrizione servizio" htmlFor="custom-description">
            <Input
              id="custom-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Es. Consegna straordinaria presso sede"
            />
          </Field>
        )}
        <Field label="Quantità" htmlFor="service-qty">
          <Input
            id="service-qty"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputMode="decimal"
          />
        </Field>
        <Field
          label="Prezzo unitario IVA inclusa"
          htmlFor="service-unit-price"
          hint={selected ? SERVICE_UNIT_LABELS[selected.unit] : "Importo fisso se voce libera"}
        >
          <Input
            id="service-unit-price"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            inputMode="decimal"
            placeholder="0,50"
          />
        </Field>
        <Field
          label="Totale diretto (alternativa)"
          htmlFor="service-total"
          hint="Se valorizzato, ha priorità sul calcolo quantità × prezzo"
        >
          <Input
            id="service-total"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            inputMode="decimal"
          />
        </Field>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="button" disabled={pending || (mode === "CATALOG" && catalog.length === 0)} onClick={addLine}>
        {pending ? "Aggiunta…" : "Aggiungi alla fattura"}
      </Button>

      <div className="space-y-2">
        <p className="text-sm font-medium">Voci già presenti</p>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna voce ancora.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {lines.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{line.description}</div>
                  <div className="text-muted-foreground">
                    {line.quantity} × {formatUnitPrice(line.unitPrice)} = {formatEUR(line.amount)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => removeLine(line.id)}
                >
                  Rimuovi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
