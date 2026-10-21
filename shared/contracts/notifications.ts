import { z } from "zod";
import { versionSchema } from "./primitives";
z.config({ jitless: true });
export const notificationPreferenceInput = z
  .object({
    version: versionSchema,
    emailEnabled: z.boolean(),
    monthly: z.boolean(),
    cards: z.boolean(),
    debts: z.boolean(),
    daysBefore: z.number().int().min(0).max(14),
  })
  .strict();
export const notificationPreferenceSchema = notificationPreferenceInput.extend({
  emailAvailable: z.boolean(),
});
export const invitationTokenInput = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
  .strict();
export const invitationLinkSchema = z.object({
  id: z.string(),
  inviterName: z.string(),
  expiresAt: z.string(),
});
