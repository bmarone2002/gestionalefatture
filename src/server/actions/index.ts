"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/server/require-user";
import { createClient, setClientActive, updateClient } from "@/server/services/clients";
import { issueInvoice } from "@/server/services/invoices";
import { InsufficientCommitmentError } from "@/lib/billing/commitment";
import { ZodError } from "zod";
import { issueDocumentSchema } from "@/lib/validation/billing";

function fromUnknown(error: unknown): ActionResult<never> {
  if (error instanceof InsufficientCommitmentError) {
    return fail("Impegno residuo insufficiente.", {
      code: error.code,
      details: {
        remaining: error.remaining.toFixed(2),
        invoiceAmount: error.invoiceAmount.toFixed(2),
        difference: error.difference.toFixed(2),
      },
    });
  }
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return fail("Controllare i dati inseriti.", { fieldErrors });
  }
  if (error instanceof Error) {
    return fail(error.message);
  }
  return fail("Operazione non riuscita.");
}

export async function createClientAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const client = await createClient(input, user.id);
    revalidatePath("/");
    revalidatePath("/clients");
    revalidatePath("/invoices");
    return ok({ id: client.id });
  } catch (error) {
    return fromUnknown(error);
  }
}

export async function updateClientAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const client = await updateClient(id, input, user.id);
    revalidatePath("/");
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    revalidatePath("/invoices");
    return ok({ id: client.id });
  } catch (error) {
    return fromUnknown(error);
  }
}

export async function setClientActiveAction(
  id: string,
  active: boolean,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    await setClientActive(id, active);
    revalidatePath("/");
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return ok({ id });
  } catch (error) {
    return fromUnknown(error);
  }
}

export async function issueInvoiceAction(
  id: string,
  external?: { externalNumber: string; externalDate: string },
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const parsed = external
      ? issueDocumentSchema.parse({ invoiceId: id, ...external })
      : null;
    await issueInvoice(
      id,
      user.id,
      parsed ? { number: parsed.externalNumber, date: parsed.externalDate } : undefined,
    );
    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    revalidatePath("/clients");
    return ok({ id });
  } catch (error) {
    return fromUnknown(error);
  }
}
