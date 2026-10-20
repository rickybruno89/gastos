import { randomUUID } from "node:crypto";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { AppConfig } from "../config";
import type { Databases } from "../persistence/database";

export function authOptions(config: AppConfig, databases: Databases) {
  return {
    appName: "GastApp",
    baseURL: config.origin,
    basePath: "/api/auth",
    secret: config.authSecret,
    database: prismaAdapter(databases.auth, { provider: "postgresql" }),
    trustedOrigins: [config.origin],
    emailAndPassword: { enabled: false },
    socialProviders: config.googleConfigured
      ? {
          google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
          },
        }
      : {},
    account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: () => randomUUID() },
      cookiePrefix: "gastapp",
      useSecureCookies: config.mode === "production",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
  } satisfies BetterAuthOptions;
}
export function createAuth(config: AppConfig, databases: Databases) {
  return betterAuth(authOptions(config, databases));
}
export type Auth = ReturnType<typeof createAuth>;
