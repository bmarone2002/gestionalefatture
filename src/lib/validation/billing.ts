import { z } from "zod";
import { isCalendarDate } from "@/lib/dates/calendar-date";

const calendarDate = z.string().refine(isCalendarDate, "Data non valida");
const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const moneyText = z.string().trim().min(1, "Importo obbligatorio");

export const contractSchema = z.object({
  clientId: z.string().min(1),
  kind: z.enum(["STORAGE", "MOVEMENTS"]),
  name: z.string().trim().min(2, "Nome contratto obbligatorio"),
  startDate: calendarDate,
  endDate: calendarDate.optional(),
  determina: optionalText,
  cig: optionalText,
  commitmentAmount: optionalText,
  notes: optionalText,
  initialBoxQuantity: z.coerce.number().int().nonnegative().optional(),
  storagePrice: optionalText,
  billingFrequency: z.enum(["QUARTERLY", "SEMIANNUAL"]).optional(),
}).superRefine((value, context) => {
  if (value.endDate && value.endDate < value.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "La fine precede l'inizio" });
  }
  if (value.kind === "STORAGE" && (!value.storagePrice || value.initialBoxQuantity == null)) {
    context.addIssue({
      code: "custom",
      path: ["storagePrice"],
      message: "Prezzo e consistenza iniziale sono obbligatori per lo stoccaggio",
    });
  }
});

export const contractVersionSchema = z.object({
  contractId: z.string().min(1),
  effectiveFrom: calendarDate,
  determina: optionalText,
  cig: optionalText,
  commitmentAmount: optionalText,
  notes: optionalText,
});

export const clientServiceSchema = z.object({
  clientId: z.string().min(1),
  contractId: z.string().min(1),
  serviceDefinitionId: z.string().optional(),
  customName: z.string().trim().optional(),
  unit: z.enum(["FIXED", "INTERVENTION", "PAGE", "SHIPMENT", "BOX"]).optional(),
  billingMode: z.enum(["ONE_OFF", "ANNUAL", "USAGE"]).optional(),
  billingFrequency: z.enum(["QUARTERLY", "SEMIANNUAL", "ANNUAL"]).optional(),
  unitPrice: moneyText,
  effectiveFrom: calendarDate,
}).superRefine((value, context) => {
  if (!value.serviceDefinitionId && !value.customName) {
    context.addIssue({
      code: "custom",
      path: ["customName"],
      message: "Selezionare un servizio o indicarne uno personalizzato",
    });
  }
});

export const stockMovementSchema = z.object({
  contractId: z.string().min(1),
  type: z.enum(["IN", "OUT"]),
  quantity: z.coerce.number().int().positive(),
  occurredOn: calendarDate,
  reason: optionalText,
});

export const serviceMovementSchema = z.object({
  clientServiceId: z.string().min(1),
  occurredOn: calendarDate,
  description: optionalText,
  quantity: z.coerce.number().positive(),
  unitPrice: optionalText,
  total: optionalText,
  permanentStockExit: z.boolean().default(false),
  stockQuantity: z.coerce.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (!value.unitPrice && !value.total) {
    context.addIssue({
      code: "custom",
      path: ["total"],
      message: "Inserire prezzo unitario o totale",
    });
  }
});

export const issueDocumentSchema = z.object({
  invoiceId: z.string().min(1),
  externalNumber: z.string().trim().min(1, "Numero documento obbligatorio"),
  externalDate: calendarDate,
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  paidAt: calendarDate,
  amount: moneyText,
  notes: optionalText,
});

export const inflationPreviewSchema = z.object({
  percentage: moneyText,
  effectiveFrom: calendarDate,
});

export const inflationConfirmSchema = z.object({
  adjustmentIds: z.array(z.string().min(1)).min(1),
});

export const invoiceServiceLineSchema = z.object({
  invoiceId: z.string().min(1),
  mode: z.enum(["CATALOG", "CUSTOM"]),
  serviceDefinitionId: z.string().optional(),
  description: z.string().trim().optional(),
  quantity: z.coerce.number().positive("Quantità obbligatoria"),
  unit: z.enum(["FIXED", "INTERVENTION", "PAGE", "SHIPMENT", "BOX"]).optional(),
  unitPrice: optionalText,
  total: optionalText,
}).superRefine((value, context) => {
  if (value.mode === "CATALOG" && !value.serviceDefinitionId) {
    context.addIssue({
      code: "custom",
      path: ["serviceDefinitionId"],
      message: "Selezionare un servizio del catalogo",
    });
  }
  if (value.mode === "CUSTOM" && !value.description) {
    context.addIssue({
      code: "custom",
      path: ["description"],
      message: "Indicare la descrizione del servizio",
    });
  }
  if (!value.unitPrice && !value.total) {
    context.addIssue({
      code: "custom",
      path: ["total"],
      message: "Inserire prezzo unitario o totale",
    });
  }
});

