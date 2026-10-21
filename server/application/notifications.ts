import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { notificationPreferenceInput } from "../../shared/contracts/notifications";
import type { Tx } from "./common";
import { audit, type MutationContext } from "./mutations";
import { HttpError } from "../http";
export async function notificationPreferences(
  tx: Tx,
  ownerId: string,
  emailAvailable: boolean,
) {
  const row = await tx.notificationPreference.upsert({
    where: { userId: ownerId },
    create: { userId: ownerId },
    update: {},
  });
  return {
    emailEnabled: row.emailEnabled,
    monthly: row.monthly,
    cards: row.cards,
    debts: row.debts,
    daysBefore: row.daysBefore,
    version: row.version,
    emailAvailable,
  };
}
export async function saveNotificationPreferences(
  context: MutationContext,
  input: z.infer<typeof notificationPreferenceInput>,
  emailAvailable: boolean,
) {
  await notificationPreferences(context.tx, context.ownerId, emailAvailable);
  const row = await context.tx.notificationPreference.updateMany({
    where: { userId: context.ownerId, version: input.version },
    data: {
      emailEnabled: input.emailEnabled,
      monthly: input.monthly,
      cards: input.cards,
      debts: input.debts,
      daysBefore: input.daysBefore,
      version: { increment: 1 },
    },
  });
  if (!row.count)
    throw new HttpError(
      409,
      "VERSION_CONFLICT",
      "Las preferencias cambiaron. Actualizá y volvé a intentar.",
    );
  await audit(context, {
    action: "notifications.preferences_changed",
    entityType: "NotificationPreference",
    entityId: randomUUID(),
    data: { ...input },
  });
  return notificationPreferences(context.tx, context.ownerId, emailAvailable);
}
