import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import type { AppConfig } from "../config";

export function createDatabases(config: AppConfig) {
  const app = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl, max: 5 }),
  });
  const auth = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.authDatabaseUrl, max: 3 }),
  });
  return {
    app,
    auth,
    close: () => Promise.all([app.$disconnect(), auth.$disconnect()]),
  };
}
export type Databases = ReturnType<typeof createDatabases>;

// `email` solo se fija con un email verificado: habilita ver invitaciones dirigidas a él.
export async function withUser<T>(
  database: PrismaClient,
  userId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  email?: string,
): Promise<T> {
  if (!userId)
    throw new Error(
      "Se requiere identidad autenticada para acceder a datos privados.",
    );
  return database.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('gastapp.user_id', ${userId}, true), set_config('gastapp.user_email', ${email?.toLowerCase() ?? ""}, true)`;
    return operation(tx);
  });
}

export async function getPreferences(database: PrismaClient, userId: string) {
  return withUser(database, userId, (tx) =>
    tx.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
  );
}

export async function updatePreferences(
  database: PrismaClient,
  userId: string,
  values: { timeZone: string },
) {
  return withUser(database, userId, (tx) =>
    tx.userPreferences.upsert({
      where: { userId },
      create: { userId, ...values },
      update: values,
    }),
  );
}
