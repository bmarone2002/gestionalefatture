"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, NativeSelect } from "@/components/forms/field";
import {
  addClientServiceAction,
  addContractVersionAction,
  createContractAction,
  recordServiceMovementAction,
  recordStockMovementAction,
  setClientServicePriceAction,
} from "@/server/actions/billing";

type ContractOption = { id: string; name: string; kind: "STORAGE" | "MOVEMENTS" };
type ServiceOption = {
  id: string;
  name: string;
  unit: "FIXED" | "INTERVENTION" | "PAGE" | "SHIPMENT" | "BOX";
};
type ClientServiceOption = ServiceOption & {
  clientServiceId: string;
  contractId: string;
  code: string | null;
};

export function ClientBillingForms({
  clientId,
  today,
  isMunicipality,
  contracts,
  standardServices,
  clientServices,
}: {
  clientId: string;
  today: string;
  isMunicipality: boolean;
  contracts: ContractOption[];
  standardServices: ServiceOption[];
  clientServices: ClientServiceOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(
    operation: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    form: HTMLFormElement,
  ) {
    setPending(true);
    setMessage(null);
    const result = await operation();
    setPending(false);
    if (!result.ok) {
      setMessage(result.error ?? "Operazione non riuscita");
      return;
    }
    form.reset();
    setMessage(success);
    router.refresh();
  }

  const storageContract = contracts.find((contract) => contract.kind === "STORAGE");
  const movementContract = contracts.find((contract) => contract.kind === "MOVEMENTS");
  const defaultServiceContract = movementContract ?? storageContract;

  return (
    <div className="space-y-4">
      {message ? <p className="rounded-md bg-muted px-3 py-2 text-sm">{message}</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Nuovo contratto</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const kind = String(data.get("kind"));
                void submit(
                  () => createContractAction({
                    clientId,
                    kind,
                    name: data.get("name"),
                    startDate: data.get("startDate"),
                    endDate: data.get("endDate") || undefined,
                    determina: data.get("determina") || undefined,
                    cig: data.get("cig") || undefined,
                    commitmentAmount: data.get("commitmentAmount") || undefined,
                    initialBoxQuantity: kind === "STORAGE"
                      ? Number(data.get("initialBoxQuantity"))
                      : undefined,
                    storagePrice: kind === "STORAGE" ? data.get("storagePrice") : undefined,
                    billingFrequency: kind === "STORAGE" ? "QUARTERLY" : undefined,
                  }),
                  "Contratto creato.",
                  form,
                );
              }}
            >
              <Field label="Tipo" htmlFor="contract-kind">
                <NativeSelect id="contract-kind" name="kind" defaultValue="MOVEMENTS">
                  {!storageContract ? <option value="STORAGE">Stoccaggio</option> : null}
                  {!movementContract ? <option value="MOVEMENTS">Movimentazioni</option> : null}
                </NativeSelect>
              </Field>
              <Field label="Nome" htmlFor="contract-name">
                <Input id="contract-name" name="name" required placeholder="Contratto movimentazioni" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data inizio" htmlFor="contract-start">
                  <Input id="contract-start" name="startDate" type="date" defaultValue={today} required />
                </Field>
                <Field label="Data fine" htmlFor="contract-end">
                  <Input id="contract-end" name="endDate" type="date" />
                </Field>
              </div>
              {isMunicipality ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Determina" htmlFor="contract-determina">
                    <Input id="contract-determina" name="determina" />
                  </Field>
                  <Field label="CIG" htmlFor="contract-cig">
                    <Input id="contract-cig" name="cig" />
                  </Field>
                  <Field label="Impegno IVA inclusa" htmlFor="contract-commitment">
                    <Input id="contract-commitment" name="commitmentAmount" inputMode="decimal" />
                  </Field>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Scatole iniziali (solo stoccaggio)" htmlFor="initial-boxes">
                  <Input id="initial-boxes" name="initialBoxQuantity" type="number" min="0" defaultValue="0" />
                </Field>
                <Field label="Prezzo mensile/scatola" htmlFor="storage-price">
                  <Input id="storage-price" name="storagePrice" inputMode="decimal" />
                </Field>
              </div>
              <Button disabled={pending || contracts.length >= 2}>Crea contratto</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Variazione prezzo</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void submit(
                  () => setClientServicePriceAction({
                    clientServiceId: String(data.get("clientServiceId")),
                    effectiveFrom: String(data.get("effectiveFrom")),
                    unitPrice: String(data.get("unitPrice")),
                  }),
                  "Nuovo prezzo salvato con decorrenza.",
                  form,
                );
              }}
            >
              <Field label="Servizio" htmlFor="price-service">
                <NativeSelect id="price-service" name="clientServiceId" required>
                  {clientServices.map((service) => (
                    <option key={service.clientServiceId} value={service.clientServiceId}>
                      {service.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nuovo prezzo IVA inclusa" htmlFor="new-price">
                  <Input id="new-price" name="unitPrice" inputMode="decimal" required />
                </Field>
                <Field label="Decorrenza" htmlFor="new-price-effective">
                  <Input id="new-price-effective" name="effectiveFrom" type="date" defaultValue={today} required />
                </Field>
              </div>
              <Button disabled={pending || clientServices.length === 0}>Aggiorna prezzo</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Nuova annualità / CIG</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void submit(
                  () => addContractVersionAction({
                    contractId: data.get("contractId"),
                    effectiveFrom: data.get("effectiveFrom"),
                    determina: data.get("determina") || undefined,
                    cig: data.get("cig") || undefined,
                    commitmentAmount: data.get("commitmentAmount") || undefined,
                    notes: data.get("notes") || undefined,
                  }),
                  "Nuova versione contrattuale creata.",
                  form,
                );
              }}
            >
              <Field label="Contratto" htmlFor="version-contract">
                <NativeSelect id="version-contract" name="contractId" required>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>{contract.name}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Decorrenza" htmlFor="version-effective">
                <Input id="version-effective" name="effectiveFrom" type="date" defaultValue={today} required />
              </Field>
              {isMunicipality ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Determina" htmlFor="version-determina">
                    <Input id="version-determina" name="determina" />
                  </Field>
                  <Field label="CIG" htmlFor="version-cig">
                    <Input id="version-cig" name="cig" />
                  </Field>
                  <Field label="Impegno IVA inclusa" htmlFor="version-commitment">
                    <Input id="version-commitment" name="commitmentAmount" inputMode="decimal" />
                  </Field>
                </div>
              ) : null}
              <Field label="Note" htmlFor="version-notes">
                <Input id="version-notes" name="notes" />
              </Field>
              <Button disabled={pending || contracts.length === 0}>Crea nuova versione</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aggiungi servizio al listino</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const serviceDefinitionId = String(data.get("serviceDefinitionId") ?? "");
                void submit(
                  () => addClientServiceAction({
                    clientId,
                    contractId: data.get("contractId"),
                    serviceDefinitionId: serviceDefinitionId || undefined,
                    customName: data.get("customName") || undefined,
                    unit: data.get("unit"),
                    billingMode: "USAGE",
                    billingFrequency: data.get("billingFrequency"),
                    unitPrice: data.get("unitPrice"),
                    effectiveFrom: data.get("effectiveFrom"),
                  }),
                  "Servizio aggiunto al listino.",
                  form,
                );
              }}
            >
              <Field label="Contratto" htmlFor="service-contract">
                <NativeSelect
                  id="service-contract"
                  name="contractId"
                  defaultValue={defaultServiceContract?.id}
                  required
                >
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>{contract.name}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Categoria standard" htmlFor="service-definition">
                <NativeSelect id="service-definition" name="serviceDefinitionId" defaultValue="">
                  <option value="">Voce personalizzata</option>
                  {standardServices.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome personalizzato" htmlFor="custom-name">
                  <Input id="custom-name" name="customName" />
                </Field>
                <Field label="Unità voce personalizzata" htmlFor="custom-unit">
                  <NativeSelect id="custom-unit" name="unit" defaultValue="FIXED">
                    <option value="FIXED">Importo fisso</option>
                    <option value="INTERVENTION">Intervento</option>
                    <option value="PAGE">Pagina</option>
                    <option value="SHIPMENT">Spedizione</option>
                    <option value="BOX">Scatola</option>
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Periodicità" htmlFor="service-frequency">
                  <NativeSelect id="service-frequency" name="billingFrequency" defaultValue="QUARTERLY">
                    <option value="QUARTERLY">Trimestrale</option>
                    <option value="SEMIANNUAL">Semestrale</option>
                    <option value="ANNUAL">Annuale</option>
                  </NativeSelect>
                </Field>
                <Field label="Prezzo IVA inclusa" htmlFor="service-price">
                  <Input id="service-price" name="unitPrice" inputMode="decimal" required />
                </Field>
                <Field label="Decorrenza" htmlFor="service-effective">
                  <Input id="service-effective" name="effectiveFrom" type="date" defaultValue={today} required />
                </Field>
              </div>
              <Button disabled={pending || contracts.length === 0}>Salva nel listino</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Variazione scatole</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                void submit(
                  () => recordStockMovementAction({
                    contractId: storageContract?.id,
                    type: data.get("type"),
                    quantity: Number(data.get("quantity")),
                    occurredOn: data.get("occurredOn"),
                    reason: data.get("reason") || undefined,
                  }),
                  "Variazione registrata e documento di rettifica proposto.",
                  form,
                );
              }}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Movimento" htmlFor="stock-type">
                  <NativeSelect id="stock-type" name="type">
                    <option value="IN">Ingresso</option>
                    <option value="OUT">Uscita</option>
                  </NativeSelect>
                </Field>
                <Field label="Scatole" htmlFor="stock-quantity">
                  <Input id="stock-quantity" name="quantity" type="number" min="1" required />
                </Field>
                <Field label="Data" htmlFor="stock-date">
                  <Input id="stock-date" name="occurredOn" type="date" defaultValue={today} required />
                </Field>
              </div>
              <Field label="Causale" htmlFor="stock-reason">
                <Input id="stock-reason" name="reason" />
              </Field>
              <Button disabled={pending || !storageContract}>Registra variazione</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Registra movimentazione</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const selected = clientServices.find(
                  (service) => service.clientServiceId === data.get("clientServiceId"),
                );
                void submit(
                  () => recordServiceMovementAction({
                    clientServiceId: data.get("clientServiceId"),
                    occurredOn: data.get("occurredOn"),
                    description: data.get("description") || undefined,
                    quantity: Number(data.get("quantity")),
                    unitPrice: data.get("unitPrice") || undefined,
                    total: data.get("total") || undefined,
                    permanentStockExit: data.get("permanentStockExit") === "on",
                    stockQuantity: data.get("stockQuantity")
                      ? Number(data.get("stockQuantity"))
                      : undefined,
                  }),
                  `${selected?.name ?? "Movimentazione"} registrata.`,
                  form,
                );
              }}
            >
              <Field label="Servizio" htmlFor="movement-service">
                <NativeSelect id="movement-service" name="clientServiceId" required>
                  {clientServices.filter((service) => service.code !== "STORAGE").map((service) => (
                    <option key={service.clientServiceId} value={service.clientServiceId}>
                      {service.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Data" htmlFor="movement-date">
                  <Input id="movement-date" name="occurredOn" type="date" defaultValue={today} required />
                </Field>
                <Field label="Quantità" htmlFor="movement-quantity">
                  <Input id="movement-quantity" name="quantity" type="number" min="0.001" step="0.001" required />
                </Field>
                <Field label="Prezzo unitario (facoltativo)" htmlFor="movement-price">
                  <Input id="movement-price" name="unitPrice" inputMode="decimal" />
                </Field>
              </div>
              <Field label="Totale diretto (alternativo)" htmlFor="movement-total">
                <Input id="movement-total" name="total" inputMode="decimal" />
              </Field>
              <Field label="Descrizione" htmlFor="movement-description">
                <Input id="movement-description" name="description" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="permanentStockExit" />
                Consegna definitiva: riduce lo stoccaggio
              </label>
              <Field label="Scatole in uscita (macero/consegna definitiva)" htmlFor="movement-stock">
                <Input id="movement-stock" name="stockQuantity" type="number" min="1" />
              </Field>
              <Button disabled={pending || clientServices.length === 0}>Registra servizio</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

