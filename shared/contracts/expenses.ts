import { z } from "zod";

z.config({ jitless: true });

export const currencySchema = z.enum(["ARS", "USD"]);
export const periodSchema = z
  .string()
  .regex(/^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$/, "Usá un período YYYY-MM.");
export const dateSchema = z.iso.date();
// BIGINT en minor units, serializado como string para no perder precisión.
export const amountMinorSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,14}$/, "El importe debe ser mayor a cero.");
export const dueDaySchema = z.number().int().min(1).max(31);
export const versionSchema = z.number().int().min(1);

export const createMonthlyExpenseSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    currency: currencySchema,
    amountMinor: amountMinorSchema,
    dueDay: dueDaySchema,
    firstPeriod: periodSchema,
  })
  .strict();
export const changeOccurrenceSchema = z
  .object({
    version: versionSchema,
    amount: z
      .object({
        amountMinor: amountMinorSchema,
        scope: z.enum(["THIS_MONTH", "THIS_AND_FUTURE"]),
      })
      .strict()
      .optional(),
    // Un nuevo vencimiento siempre aplica al mes actual y a los futuros.
    dueDay: dueDaySchema.optional(),
  })
  .strict()
  .refine((value) => value.amount || value.dueDay, "No hay cambios.");
export const payOccurrenceSchema = z
  .object({
    version: versionSchema,
    paidOn: dateSchema.optional(),
    channel: z.string().trim().min(1).max(40).optional(),
  })
  .strict();
export const undoPaymentSchema = z.object({ version: versionSchema }).strict();

export const occurrenceSchema = z.object({
  id: z.string(),
  seriesId: z.string(),
  name: z.string(),
  period: periodSchema,
  dueDate: dateSchema,
  dueDay: dueDaySchema,
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  status: z.enum(["PLANNED", "PAID"]),
  version: versionSchema,
  payment: z
    .object({ paidOn: dateSchema, channel: z.string().nullable() })
    .nullable(),
});
export const monthSchema = z.object({
  period: periodSchema,
  today: dateSchema,
  occurrences: z.array(occurrenceSchema),
  totals: z.array(
    z.object({
      currency: currencySchema,
      pendingMinor: z.string(),
      paidMinor: z.string(),
    }),
  ),
});
export const monthlyExpenseSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: currencySchema,
  firstPeriod: periodSchema,
  version: versionSchema,
});
export type Occurrence = z.infer<typeof occurrenceSchema>;
export type Month = z.infer<typeof monthSchema>;
