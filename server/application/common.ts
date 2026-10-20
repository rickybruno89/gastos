import type { Prisma } from "../generated/prisma/client";

export type Tx = Prisma.TransactionClient;

// Los períodos se guardan como DATE del primer día del mes, en UTC.
export const periodDate = (period: string) =>
  new Date(`${period}-01T00:00:00Z`);
export const isoDate = (date: string) => new Date(`${date}T00:00:00Z`);
export const toPeriod = (date: Date) => date.toISOString().slice(0, 7);
export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export async function timeZoneOf(tx: Tx, ownerId: string) {
  const preferences = await tx.userPreferences.upsert({
    where: { userId: ownerId },
    create: { userId: ownerId },
    update: {},
  });
  return preferences.timeZone;
}
