"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { issueInvoiceAction } from "@/server/actions";
import { formatEUR } from "@/lib/money";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";

export function IssueInvoiceButton({
  invoiceId,
  amount,
  canIssue,
  remaining,
  difference,
  today,
}: {
  invoiceId: string;
  amount: string;
  canIssue: boolean;
  remaining?: string;
  difference?: string;
  today: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<{
    remaining?: string;
    invoiceAmount?: string;
    difference?: string;
  } | null>(null);
  const [externalNumber, setExternalNumber] = useState("");
  const [externalDate, setExternalDate] = useState(today);

  async function confirm() {
    setPending(true);
    setError(null);
    if (!externalNumber.trim() || !externalDate) {
      setPending(false);
      setError("Inserire numero e data del documento emesso nel gestionale contabile.");
      return;
    }
    const result = await issueInvoiceAction(invoiceId, { externalNumber, externalDate });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      setDetails(result.details ?? null);
      return;
    }
    router.refresh();
  }

  if (!canIssue) {
    return (
      <Alert variant="destructive" className="border-red-600 bg-red-50 text-red-900">
        <AlertTitle className="text-base font-semibold tracking-wide">ATTENZIONE</AlertTitle>
        <AlertDescription className="text-red-900">
          <p className="font-medium">Impegno residuo insufficiente.</p>
          <p>Residuo disponibile: {formatEUR(remaining ?? "0")}</p>
          <p>Prossima fattura: {formatEUR(amount)}</p>
          <p>Differenza: {formatEUR(difference ?? remaining ?? "0")}</p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-3">
      {error ? (
        <Alert variant="destructive" className="border-red-600 bg-red-50">
          <AlertTitle>ATTENZIONE</AlertTitle>
          <AlertDescription>
            {error}
            {details?.remaining ? (
              <span className="mt-2 block">
                Residuo disponibile: {formatEUR(details.remaining)}
                <br />
                Prossima fattura: {formatEUR(details.invoiceAmount ?? amount)}
                <br />
                Differenza: {formatEUR(details.difference ?? "0")}
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger render={<Button disabled={pending} />}>
          Segna come emessa
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma emissione</AlertDialogTitle>
            <AlertDialogDescription>
              Confermi di voler segnare questa fattura da {formatEUR(amount)} come emessa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3">
            <Field label="Numero documento esterno" htmlFor="externalNumber">
              <Input
                id="externalNumber"
                value={externalNumber}
                onChange={(event) => setExternalNumber(event.target.value)}
                placeholder="Es. 42/2026"
              />
            </Field>
            <Field label="Data documento esterno" htmlFor="externalDate">
              <Input
                id="externalDate"
                type="date"
                value={externalDate}
                onChange={(event) => setExternalDate(event.target.value)}
              />
            </Field>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending || !externalNumber.trim() || !externalDate}
              onClick={confirm}
            >
              Segna come emessa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
