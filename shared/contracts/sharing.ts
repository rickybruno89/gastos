import { z } from "zod";
import { currencySchema, periodSchema, versionSchema } from "./primitives";

z.config({ jitless: true });

const nicknameSchema = z.string().trim().min(1).max(60);
const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const createContactSchema = z
  .object({ nickname: nicknameSchema, email: emailSchema.optional() })
  .strict();
export const updateContactSchema = z
  .object({
    version: versionSchema,
    nickname: nicknameSchema.optional(),
    email: emailSchema.nullable().optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.nickname !== undefined ||
      value.email !== undefined ||
      value.archived !== undefined,
    "No hay cambios.",
  );

// Porcentajes en basis points (10.000 = 100%); el propietario conserva el resto.
export const sharesSchema = z
  .array(
    z
      .object({
        contactId: z.uuid(),
        shareBps: z.number().int().min(1).max(10_000),
      })
      .strict(),
  )
  .max(10)
  .refine(
    (shares) => new Set(shares.map((s) => s.contactId)).size === shares.length,
    "Cada contacto puede aparecer una sola vez.",
  )
  .refine(
    (shares) => shares.reduce((total, s) => total + s.shareBps, 0) <= 10_000,
    "El reparto no puede superar el 100%.",
  );
export const putSharesSchema = z
  .object({ version: versionSchema, shares: sharesSchema })
  .strict();

export const connectionStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "BLOCKED",
]);
export const contactSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  email: z.string().nullable(),
  archived: z.boolean(),
  version: versionSchema,
  connection: z
    .object({
      id: z.string(),
      status: connectionStatusSchema,
      // SENT: invitaste vos; RECEIVED: aceptaste una invitación.
      direction: z.enum(["SENT", "RECEIVED"]),
      otherName: z.string().nullable(),
      acceptedPeriod: periodSchema.nullable(),
    })
    .nullable(),
});
export const invitationSchema = z.object({
  id: z.string(),
  inviterName: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
});
const lineSchema = z.object({
  expenseName: z.string(),
  totalMinor: z.string(),
  shareBps: z.number().int(),
  amountMinor: z.string(),
  currency: currencySchema,
});
export const sharedMonthSchema = z.object({
  period: periodSchema,
  people: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      contactId: z.string().nullable(),
      connected: z.boolean(),
      balances: z.array(
        z.object({
          currency: currencySchema,
          theyOweMinor: z.string(),
          iOweMinor: z.string(),
        }),
      ),
      theyOwe: z.array(lineSchema),
      iOwe: z.array(lineSchema),
    }),
  ),
});
export type Contact = z.infer<typeof contactSchema>;
export type SharedMonth = z.infer<typeof sharedMonthSchema>;
export type ShareInput = z.infer<typeof sharesSchema>;
