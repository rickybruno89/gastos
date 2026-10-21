import { z } from "zod";
import {
  amountMinorSchema,
  currencySchema,
  dateSchema,
  versionSchema,
} from "./primitives";

z.config({ jitless: true });

const descriptionSchema = z.string().trim().min(1).max(120);
const notesSchema = z.string().trim().max(500);
const reasonSchema = z.string().trim().min(1).max(200);

export const createDebtSchema = z
  .object({
    contactId: z.uuid(),
    description: descriptionSchema,
    currency: currencySchema,
    principalMinor: amountMinorSchema,
    lentOn: dateSchema,
    dueOn: dateSchema.optional(),
    notes: notesSchema.optional(),
  })
  .strict()
  .refine((value) => !value.dueOn || value.dueOn >= value.lentOn, {
    message: "El vencimiento no puede ser anterior al préstamo.",
    path: ["dueOn"],
  });
// El principal no se edita: se corrige con un ajuste explícito.
export const updateDebtSchema = z
  .object({
    version: versionSchema,
    description: descriptionSchema.optional(),
    notes: notesSchema.nullable().optional(),
    dueOn: dateSchema.nullable().optional(),
  })
  .strict();
export const debtPaymentSchema = z
  .object({
    version: versionSchema,
    amountMinor: amountMinorSchema,
    paidOn: dateSchema,
    note: z.string().trim().max(300).optional(),
  })
  .strict();
export const debtAdjustmentSchema = z
  .object({
    version: versionSchema,
    kind: z.enum(["INCREASE", "FORGIVE"]),
    amountMinor: amountMinorSchema,
    effectiveOn: dateSchema,
    reason: reasonSchema,
  })
  .strict();
export const cancelDebtSchema = z
  .object({ version: versionSchema, reason: reasonSchema })
  .strict();
export const debtVersionSchema = z.object({ version: versionSchema }).strict();

export const debtStatusSchema = z.enum([
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
  "CANCELLED",
]);
const minorSchema = z.string().regex(/^-?\d+$/);
export const debtSchema = z.object({
  id: z.string(),
  contactId: z.string(),
  contactName: z.string(),
  description: z.string(),
  notes: z.string().nullable(),
  currency: currencySchema,
  principalMinor: z.string(),
  owedMinor: minorSchema,
  paidMinor: minorSchema,
  forgivenMinor: minorSchema,
  balanceMinor: minorSchema,
  status: debtStatusSchema,
  lentOn: dateSchema,
  dueOn: dateSchema.nullable(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  version: versionSchema,
});
export const debtEventSchema = z.object({
  id: z.string(),
  kind: z.enum(["LENT", "PAYMENT", "INCREASE", "FORGIVE", "CANCELLED"]),
  date: dateSchema,
  amountMinor: z.string().nullable(),
  note: z.string().nullable(),
  reverted: z.boolean(),
  recordedAt: z.string(),
});
export const debtDetailSchema = debtSchema.extend({
  events: z.array(debtEventSchema),
});
export const debtListSchema = z.object({
  debts: z.array(debtSchema),
  // Lo que falta cobrar, por moneda, de deudas abiertas o con pagos parciales.
  totals: z.array(
    z.object({
      currency: currencySchema,
      outstandingMinor: z.string(),
      count: z.number().int(),
    }),
  ),
});
export type Debt = z.infer<typeof debtSchema>;
export type DebtDetail = z.infer<typeof debtDetailSchema>;
