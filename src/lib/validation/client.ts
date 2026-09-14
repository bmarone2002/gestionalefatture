import { z } from "zod";
import { BILLING_FREQUENCIES, CLIENT_TYPES } from "@/lib/domain/enums";
import { isCalendarDate } from "@/lib/dates/calendar-date";
import { parseItalianDecimal } from "@/lib/money";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

export const clientFormSchema = z
  .object({
    name: z.string().trim().min(1, "La denominazione è obbligatoria"),
    type: z.enum(CLIENT_TYPES),
    taxCode: optionalText,
    vatNumber: optionalText,
    notes: optionalText,
    boxQuantity: z.coerce
      .number({ error: "La quantità scatole è obbligatoria" })
      .int("La quantità scatole deve essere un numero intero")
      .positive("La quantità scatole deve essere maggiore di zero"),
    monthlyPricePerBox: z.string().trim().min(1, "Il prezzo mensile è obbligatorio"),
    billingFrequency: z.enum(BILLING_FREQUENCIES, {
      error: "La periodicità è obbligatoria",
    }),
    registrationDate: z
      .string()
      .refine(isCalendarDate, "La data di registrazione non è valida"),
    determina: optionalText,
    cig: optionalText,
    commitmentAmount: optionalText,
    active: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    try {
      const price = parseItalianDecimal(value.monthlyPricePerBox);
      if (price.isNegative()) {
        ctx.addIssue({
          code: "custom",
          path: ["monthlyPricePerBox"],
          message: "Il prezzo mensile non può essere negativo",
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        path: ["monthlyPricePerBox"],
        message: "Prezzo mensile non valido",
      });
    }

    if (value.type === "MUNICIPALITY") {
      if (!value.determina) {
        ctx.addIssue({
          code: "custom",
          path: ["determina"],
          message: "La determina è obbligatoria per i Comuni",
        });
      }
      if (!value.cig) {
        ctx.addIssue({
          code: "custom",
          path: ["cig"],
          message: "Il CIG è obbligatorio per i Comuni",
        });
      }
      if (!value.commitmentAmount) {
        ctx.addIssue({
          code: "custom",
          path: ["commitmentAmount"],
          message: "L'importo impegno è obbligatorio per i Comuni",
        });
      } else {
        try {
          const commitment = parseItalianDecimal(value.commitmentAmount);
          if (!commitment.gt(0)) {
            ctx.addIssue({
              code: "custom",
              path: ["commitmentAmount"],
              message: "L'impegno deve essere maggiore di zero",
            });
          }
        } catch {
          ctx.addIssue({
            code: "custom",
            path: ["commitmentAmount"],
            message: "Impegno non valido",
          });
        }
      }
    }
  });

export type ClientFormInput = z.infer<typeof clientFormSchema>;

export const clientFiltersSchema = z.object({
  q: z.string().optional(),
  type: z.enum([...CLIENT_TYPES, "ALL"]).optional(),
  frequency: z.enum([...BILLING_FREQUENCIES, "ALL"]).optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).optional(),
});
