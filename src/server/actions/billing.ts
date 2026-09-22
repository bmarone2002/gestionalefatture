"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/server/require-user";
import { createContract, addContractVersion } from "@/server/services/contracts";
import { addClientService, setClientServicePrice } from "@/server/services/service-catalog";
import { recordServiceMovement, recordStockMovement } from "@/server/services/movements";
import { recordPayment } from "@/server/services/payments";
import {
  confirmInflationAdjustments,
  createInflationPreview,
} from "@/server/services/istat";
import {
  addInvoiceServiceLine,
  removeInvoiceServiceLine,
} from "@/server/services/invoices";

function errorResult(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return fail("Controllare i dati inseriti.", { fieldErrors });
  }
  return fail(error instanceof Error ? error.message : "Operazione non riuscita.");
}

function refreshBilling(clientId?: string, invoiceId?: string) {
  revalidatePath("/");
  revalidatePath("/clients");
  revalidatePath("/invoices");
  revalidatePath("/istat");
  if (clientId) revalidatePath(`/clients/${clientId}`);
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
}

export async function createContractAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const contract = await createContract(input, user.id);
    const clientId = typeof input === "object" && input && "clientId" in input
      ? String(input.clientId)
      : undefined;
    refreshBilling(clientId);
    return ok({ id: contract.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function addContractVersionAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const version = await addContractVersion(input);
    refreshBilling();
    return ok({ id: version.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function addClientServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const service = await addClientService(input);
    const clientId = typeof input === "object" && input && "clientId" in input
      ? String(input.clientId)
      : undefined;
    refreshBilling(clientId);
    return ok({ id: service.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function setClientServicePriceAction(input: {
  clientServiceId: string;
  effectiveFrom: string;
  unitPrice: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const price = await setClientServicePrice(input);
    refreshBilling();
    return ok({ id: price.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function recordStockMovementAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const movement = await recordStockMovement(input, user.id);
    refreshBilling();
    return ok({ id: movement.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function recordServiceMovementAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const movement = await recordServiceMovement(input, user.id);
    refreshBilling();
    return ok({ id: movement.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function recordPaymentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const payment = await recordPayment(input, user.id);
    const invoiceId = typeof input === "object" && input && "invoiceId" in input
      ? String(input.invoiceId)
      : undefined;
    refreshBilling(undefined, invoiceId);
    return ok({ id: payment.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function createInflationPreviewAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  try {
    await requireUser();
    const rows = await createInflationPreview(input);
    refreshBilling();
    return ok({ count: rows.length });
  } catch (error) {
    return errorResult(error);
  }
}

export async function confirmInflationAdjustmentsAction(
  adjustmentIds: string[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireUser();
    await confirmInflationAdjustments({ adjustmentIds }, user.id);
    refreshBilling();
    return ok({ count: adjustmentIds.length });
  } catch (error) {
    return errorResult(error);
  }
}

export async function addInvoiceServiceLineAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const line = await addInvoiceServiceLine(input);
    const invoiceId =
      typeof input === "object" && input && "invoiceId" in input
        ? String(input.invoiceId)
        : undefined;
    refreshBilling(undefined, invoiceId);
    return ok({ id: line.id });
  } catch (error) {
    return errorResult(error);
  }
}

export async function removeInvoiceServiceLineAction(
  lineId: string,
  invoiceId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    await removeInvoiceServiceLine(lineId);
    refreshBilling(undefined, invoiceId);
    return ok({ id: lineId });
  } catch (error) {
    return errorResult(error);
  }
}

