import { z } from "zod";
import { BILLING_FREQUENCIES, CLIENT_TYPES, INVOICE_STATUSES } from "@/lib/domain/enums";

export const invoiceFiltersSchema = z.object({
  status: z.enum([...INVOICE_STATUSES, "ALL", "OVERDUE"]).optional(),
  range: z.enum(["ALL", "THIS_MONTH", "NEXT_MONTH"]).optional(),
  clientId: z.string().optional(),
  type: z.enum([...CLIENT_TYPES, "ALL"]).optional(),
  frequency: z.enum([...BILLING_FREQUENCIES, "ALL"]).optional(),
  q: z.string().optional(),
});

export type InvoiceFiltersInput = z.infer<typeof invoiceFiltersSchema>;
