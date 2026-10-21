import { z } from "zod";
import {
  amountMinorSchema,
  currencySchema,
  dateSchema,
  dueDaySchema,
  periodSchema,
  versionSchema,
} from "./primitives";
import { sharesSchema } from "./sharing";
import { addMonths } from "../domain/periods";
z.config({ jitless: true });
const description = z.string().trim().min(1).max(120);
const reason = z.string().trim().min(1).max(200);
const minor = z.string().regex(/^-?\d{1,15}$/);
export const createCardSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    lastFour: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    closingDay: dueDaySchema,
    dueDay: dueDaySchema,
  })
  .strict();
export const updateCardSchema = createCardSchema
  .partial()
  .extend({
    version: versionSchema,
    archived: z.boolean().optional(),
    lastFour: createCardSchema.shape.lastFour.nullable(),
  })
  .strict();
export const createPurchaseSchema = z
  .object({
    description,
    occurredOn: dateSchema,
    firstPeriod: periodSchema,
    amountMinor: amountMinorSchema,
    currency: currencySchema,
    installments: z.number().int().min(1).max(120).default(1),
    shares: sharesSchema.default([]),
    confirmDuplicate: z.boolean().default(false),
  })
  .strict()
  .refine(
    (v) =>
      v.firstPeriod >= v.occurredOn.slice(0, 7) &&
      addMonths(v.firstPeriod, v.installments - 1) <= "2100-12" &&
      BigInt(v.amountMinor) >= BigInt(v.installments),
    "Revisá la primera cuota y el importe por cuota.",
  );
export const createRecurringSchema = z
  .object({
    description,
    firstPeriod: periodSchema,
    amountMinor: amountMinorSchema,
    currency: currencySchema,
    shares: sharesSchema.default([]),
  })
  .strict();
export const updateRecurringSchema = z
  .object({
    version: versionSchema,
    fromPeriod: periodSchema,
    amountMinor: amountMinorSchema.optional(),
    shares: sharesSchema.optional(),
    endPeriod: periodSchema.nullable().optional(),
  })
  .strict();
export const statementDatesSchema = z
  .object({
    version: versionSchema,
    closingDate: dateSchema,
    dueDate: dateSchema,
    bankArsMinor: minor.nullable().optional(),
    bankUsdMinor: minor.nullable().optional(),
  })
  .strict()
  .refine(
    (v) => v.dueDate >= v.closingDate,
    "El vencimiento no puede ser anterior al cierre.",
  );
export const statementVersionSchema = z
  .object({ version: versionSchema })
  .strict();
export const statementPaymentSchema = z
  .object({
    version: versionSchema,
    paidOn: dateSchema.optional(),
    channel: z.string().trim().min(1).max(40).optional(),
  })
  .strict();
export const updateCardChargeSchema = z
  .object({
    version: versionSchema,
    statementVersion: versionSchema,
    description: description.optional(),
    amountMinor: amountMinorSchema.optional(),
    shares: sharesSchema.optional(),
    scope: z.enum(["THIS", "THIS_AND_FUTURE"]).default("THIS"),
  })
  .strict()
  .refine(
    (v) =>
      v.description !== undefined ||
      v.amountMinor !== undefined ||
      v.shares !== undefined,
    "No hay cambios.",
  );
export const createStatementLineSchema = z
  .object({
    version: versionSchema,
    description,
    postedOn: dateSchema,
    amountMinor: minor,
    currency: currencySchema,
  })
  .strict()
  .refine((v) => BigInt(v.amountMinor) !== 0n, "El importe no puede ser cero.");
export const matchCardChargeSchema = z
  .object({
    version: versionSchema,
    chargeId: z.uuid(),
    lineId: z.uuid().optional(),
    postedOn: dateSchema.optional(),
  })
  .strict();
export const resolveStatementLineSchema = z
  .object({
    version: versionSchema,
    action: z.enum(["IGNORE", "CREATE_CHARGE", "UNMATCH", "DELETE"]),
    reason: reason.optional(),
    shares: sharesSchema.default([]),
  })
  .strict()
  .refine(
    (v) => v.action !== "IGNORE" || !!v.reason,
    "Indicá el motivo de exclusión.",
  );
export const deferCardChargeSchema = z
  .object({ version: versionSchema, chargeVersion: versionSchema, reason })
  .strict();
export const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  lastFour: z.string().nullable(),
  closingDay: z.number(),
  dueDay: z.number(),
  archived: z.boolean(),
  version: z.number(),
});
export const cardListSchema = z.array(cardSchema);
const allocation = z.object({
  contactId: z.string().nullable(),
  nickname: z.string().nullable(),
  shareBps: z.number(),
  amountMinor: z.string(),
});
export const cardChargeSchema = z.object({
  id: z.string(),
  description: z.string(),
  occurredOn: dateSchema,
  expectedPeriod: periodSchema,
  amountMinor: z.string(),
  currency: currencySchema,
  version: z.number(),
  purchaseId: z.string().nullable(),
  recurringId: z.string().nullable(),
  installmentNo: z.number().nullable(),
  installments: z.number().nullable(),
  lineId: z.string().nullable(),
  status: z.enum(["EXPECTED", "MATCHED"]),
  allocations: z.array(allocation),
});
export const recurringSchema = z.object({
  id: z.string(),
  description: z.string(),
  currency: currencySchema,
  firstPeriod: periodSchema,
  endPeriod: periodSchema.nullable(),
  version: z.number(),
  amountMinor: z.string(),
  shares: sharesSchema,
});
export const statementSchema = z.object({
  id: z.string(),
  card: cardSchema,
  period: periodSchema,
  closingDate: dateSchema,
  dueDate: dateSchema,
  status: z.enum(["DRAFT", "RECONCILED", "PAID"]),
  version: z.number(),
  bankArsMinor: z.string().nullable(),
  bankUsdMinor: z.string().nullable(),
  totals: z.array(
    z.object({ currency: currencySchema, amountMinor: z.string() }),
  ),
  charges: z.array(cardChargeSchema),
  lines: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      postedOn: dateSchema,
      amountMinor: z.string(),
      currency: currencySchema,
      chargeId: z.string().nullable(),
      ignoreReason: z.string().nullable(),
      status: z.enum(["MATCHED", "UNMATCHED_ACTUAL", "IGNORED_WITH_REASON"]),
    }),
  ),
  deferred: z.array(
    z.object({
      id: z.string(),
      chargeId: z.string(),
      description: z.string(),
      toPeriod: periodSchema,
      reason: z.string(),
    }),
  ),
  payment: z
    .object({ paidOn: dateSchema, channel: z.string().nullable() })
    .nullable(),
  recurring: z.array(recurringSchema),
});
export const cardMonthSchema = z.object({
  period: periodSchema,
  statements: z.array(
    z.object({
      id: z.string(),
      cardId: z.string(),
      cardName: z.string(),
      period: periodSchema,
      dueDate: dateSchema,
      status: z.enum(["DRAFT", "RECONCILED", "PAID"]),
      version: z.number(),
      totals: z.array(
        z.object({ currency: currencySchema, amountMinor: z.string() }),
      ),
      unresolved: z.number(),
    }),
  ),
});
export type CreditCard = z.infer<typeof cardSchema>;
export type CardStatement = z.infer<typeof statementSchema>;
export type CardCharge = z.infer<typeof cardChargeSchema>;
export type CardRecurring = z.infer<typeof recurringSchema>;
