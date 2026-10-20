import { z } from "zod";
import {
  currencySchema,
  periodSchema,
  dateSchema,
  amountMinorSchema,
  dueDaySchema,
  versionSchema,
  intervalMonthsSchema,
} from "./primitives";
import { sharesSchema } from "./sharing";

z.config({ jitless: true });

export {
  currencySchema,
  periodSchema,
  dateSchema,
  amountMinorSchema,
  dueDaySchema,
  versionSchema,
  intervalMonthsSchema,
};
const reasonSchema = z.string().trim().min(1).max(200);
const channelSchema = z.string().trim().min(1).max(40);

export const createMonthlyExpenseSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    currency: currencySchema,
    amountMinor: amountMinorSchema,
    dueDay: dueDaySchema,
    // 1 = mensual, 2 = bimestral anclado en firstPeriod.
    intervalMonths: intervalMonthsSchema.default(1),
    firstPeriod: periodSchema,
    // Reparto entre contactos; vacío = gasto personal.
    shares: sharesSchema.default([]),
  })
  .strict();
export const renameMonthlyExpenseSchema = z
  .object({ version: versionSchema, name: z.string().trim().min(1).max(80) })
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
    channel: channelSchema.optional(),
  })
  .strict();
export const annualPaymentSchema = z
  .object({
    version: versionSchema,
    // Meses cubiertos incluyendo el del pago.
    months: z.number().int().min(2).max(24),
    amountMinor: amountMinorSchema,
    paidOn: dateSchema.optional(),
    channel: channelSchema.optional(),
  })
  .strict();
export const versionOnlySchema = z.object({ version: versionSchema }).strict();
export const undoPaymentSchema = versionOnlySchema;
export const reasonInputSchema = z
  .object({ version: versionSchema, reason: reasonSchema })
  .strict();

export const occurrenceSchema = z.object({
  id: z.string(),
  seriesId: z.string(),
  name: z.string(),
  period: periodSchema,
  dueDate: dateSchema,
  dueDay: dueDaySchema,
  amountMinor: amountMinorSchema,
  currency: currencySchema,
  status: z.enum(["PLANNED", "PAID", "COVERED", "SKIPPED", "CANCELLED"]),
  statusReason: z.string().nullable(),
  version: versionSchema,
  intervalMonths: intervalMonthsSchema,
  seriesVersion: versionSchema,
  payment: z
    .object({
      paidOn: dateSchema,
      channel: z.string().nullable(),
      amountMinor: amountMinorSchema,
      annual: z.boolean(),
    })
    .nullable(),
  // Pago anual que cubre este mes (COVERED) o que se pagó en este mes.
  coverage: z
    .object({ fromPeriod: periodSchema, toPeriod: periodSchema })
    .nullable(),
  // Reparto vigente del mes; amountMinor es null cuando el mes no reparte (omitido, cubierto, baja).
  sharing: z
    .object({
      ownerShareBps: z.number().int(),
      participants: z.array(
        z.object({
          contactId: z.string(),
          nickname: z.string(),
          shareBps: z.number().int(),
          amountMinor: z.string().nullable(),
        }),
      ),
    })
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
  intervalMonths: intervalMonthsSchema,
  firstPeriod: periodSchema,
  endPeriod: periodSchema.nullable(),
  version: versionSchema,
});
export type Occurrence = z.infer<typeof occurrenceSchema>;
export type Month = z.infer<typeof monthSchema>;
