import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { parseConfig } from "../../server/config";
import { createDatabases } from "../../server/persistence/database";
import { authOptions } from "../../server/auth/index";
import { createApp, errorHandler } from "../../server/app";

loadEnv({ path: ".env.local", quiet: true });

// Crea una base temporal gastapp_test_* con las migraciones, dos usuarios con
// sesión real y la API escuchando en un puerto libre. close() elimina todo.
export async function startTestApp() {
  const migrationUrl = new URL(
    process.env.MIGRATION_DATABASE_URL ?? "postgresql://invalid/invalid",
  );
  assert.ok(
    ["localhost", "127.0.0.1", "[::1]"].includes(migrationUrl.hostname),
    "Las pruebas de integración solo usan PostgreSQL local.",
  );
  assert.equal(migrationUrl.pathname, "/gastappv2");
  const name = `gastapp_test_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: migrationUrl.toString() });
  await admin.connect();
  await admin.query(
    `CREATE DATABASE ${pg.escapeIdentifier(name)} TEMPLATE template0`,
  );
  const forDatabase = (url: string) => {
    const value = new URL(url);
    value.pathname = `/${name}`;
    return value.toString();
  };
  const config = parseConfig({
    ...process.env,
    NODE_ENV: "test",
    APP_ORIGIN: "http://localhost:3000",
    DATABASE_URL: forDatabase(process.env.DATABASE_URL!),
    AUTH_DATABASE_URL: forDatabase(process.env.AUTH_DATABASE_URL!),
    WORKER_DATABASE_URL: forDatabase(process.env.WORKER_DATABASE_URL!),
    MAIL_MODE: "capture",
    GOOGLE_CLIENT_ID: "local-integration-client",
    GOOGLE_CLIENT_SECRET: "local-integration-secret",
  });
  const databases = createDatabases(config);
  let closeServer: (() => Promise<void>) | undefined;
  const close = async () => {
    try {
      if (closeServer) await closeServer();
      await databases.close();
      // Los pools ya están cerrados. DROP espera a que PostgreSQL observe sus
      // desconexiones; FORCE exigiría privilegios para terminar otros roles.
      await admin.query(`DROP DATABASE ${pg.escapeIdentifier(name)}`);
    } finally {
      await admin.end();
    }
  };
  try {
    const migration = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      {
        env: {
          ...process.env,
          MIGRATION_DATABASE_URL: forDatabase(migrationUrl.toString()),
        },
        encoding: "utf8",
      },
    );
    assert.equal(migration.status, 0, migration.stderr);
    // The privileged test helpers exist only in this test instance, never in server/auth.
    const testAuth = betterAuth({
      ...authOptions(config, databases),
      plugins: [testUtils()],
    });
    const helpers = (await testAuth.$context).test;
    // Google entrega emails verificados; las invitaciones lo exigen.
    const user = (email: string, name: string) =>
      helpers.saveUser(
        helpers.createUser({ email, name, emailVerified: true }),
      );
    const userA = await user("ricky@example.test", "Ricky");
    const userB = await user("juan@example.test", "Juan");
    const userC = await user("caro@example.test", "Caro");
    const loginA = await helpers.login({ userId: userA.id });
    const loginB = await helpers.login({ userId: userB.id });
    const loginC = await helpers.login({ userId: userC.id });
    const { app } = createApp(config, databases);
    app.use(errorHandler);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    const call = (path: string, cookie?: string, options: RequestInit = {}) =>
      fetch(`${origin}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { cookie } : {}),
          ...options.headers,
        },
      });
    return {
      config,
      databases,
      userA,
      userB,
      userC,
      loginA,
      cookieA: loginA.headers.get("cookie")!,
      cookieB: loginB.headers.get("cookie")!,
      cookieC: loginC.headers.get("cookie")!,
      call,
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
