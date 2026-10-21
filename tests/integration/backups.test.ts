import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { once } from "node:events";
import path from "node:path";
import pg from "pg";
import {
  createBackup,
  restoreBackup,
  adminUrl,
  localDatabase,
} from "../../scripts/lib/local-backups.mjs";
import { startTestApp } from "./harness";
import { createDatabases } from "../../server/persistence/database";
import { createApp, errorHandler } from "../../server/app";

test("backup cifrado y restauración aislada preservan datos, archivos, auth y RLS", async () => {
  const h = await startTestApp(),
    dir = await mkdtemp(path.join(tmpdir(), "gastapp-backup-test-")),
    key = randomBytes(32).toString("hex");
  let restoredName: string | undefined;
  try {
    assert.throws(() =>
      localDatabase("postgresql://user:pass@remote.example/gastappv2"),
    );
    assert.throws(() =>
      localDatabase("postgresql://user:pass@localhost/production"),
    );
    const files = path.join(dir, "files");
    await mkdir(files);
    await writeFile(
      path.join(files, "comprobante.txt"),
      "Evidencia sintética de prueba",
      { mode: 0o600 },
    );
    const create = await h.call("/api/v2/expenses", h.cookieA, {
      method: "POST",
      headers: { origin: h.config.origin, "Idempotency-Key": randomUUID() },
      body: JSON.stringify({
        name: "Importe exacto",
        currency: "ARS",
        amountMinor: "10001",
        dueDay: 31,
        firstPeriod: "2026-10",
      }),
    });
    assert.equal(create.status, 201);
    const month = await (
      await h.call("/api/v2/months/2026-10", h.cookieA)
    ).json();
    const database = new URL(h.config.databaseUrl); // La herramienta usa el administrador local, no amplía permisos del rol de app.
    const backup = await createBackup({
      database: database.toString(),
      outputRoot: path.join(dir, "backups"),
      filesRoot: files,
      key,
      keep: 14,
    });
    const encrypted = await readFile(path.join(backup, "database.dump.enc"));
    assert.equal(encrypted.includes(Buffer.from("Importe exacto")), false);
    assert.equal(
      (await readFile(path.join(backup, "backup.json"), "utf8")).includes(key),
      false,
    );
    await assert.rejects(() =>
      restoreBackup({
        directory: backup,
        key: "00".repeat(32),
        database: database.toString(),
        outputRoot: path.join(dir, "restores"),
      }),
    );
    // Cambios posteriores no pueden aparecer en el snapshot restaurado.
    const occurrence = month.data.occurrences[0];
    assert.equal(
      (
        await h.call(
          `/api/v2/occurrences/${occurrence.id}/payments`,
          h.cookieA,
          {
            method: "POST",
            headers: {
              origin: h.config.origin,
              "Idempotency-Key": randomUUID(),
            },
            body: JSON.stringify({ version: occurrence.version }),
          },
        )
      ).status,
      201,
    );
    await writeFile(path.join(files, "comprobante.txt"), "Modificado después");
    const restored = await restoreBackup({
      directory: backup,
      key,
      database: database.toString(),
      outputRoot: path.join(dir, "restores"),
    });
    restoredName = restored.database;
    assert.notEqual(restored.database, database.pathname.slice(1));
    assert.ok(restored.tables > 25);
    assert.equal(
      await readFile(path.join(restored.filesDir, "comprobante.txt"), "utf8"),
      "Evidencia sintética de prueba",
    );
    const inRestored = (value: string) => {
      const url = new URL(value);
      url.pathname = "/" + restored.database;
      return url.toString();
    };
    const config = {
      ...h.config,
      databaseUrl: inRestored(h.config.databaseUrl),
      authDatabaseUrl: inRestored(h.config.authDatabaseUrl),
      mail: { ...h.config.mail, mode: "disabled" as const },
    };
    const databases = createDatabases(config),
      { app } = createApp(config, databases);
    app.use(errorHandler);
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const origin = `http://127.0.0.1:${address.port}`;
      assert.equal((await fetch(origin + "/healthz")).status, 200);
      const account = await fetch(origin + "/api/v2/me", {
        headers: { cookie: h.cookieA },
      });
      assert.equal(account.status, 200);
      assert.equal((await account.json()).data.id, h.userA.id);
      const restoredMonth = await fetch(origin + "/api/v2/months/2026-10", {
        headers: { cookie: h.cookieA },
      });
      const json = await restoredMonth.json();
      assert.equal(json.data.occurrences[0].status, "PLANNED");
      assert.equal(json.data.occurrences[0].amountMinor, "10001");
      assert.deepEqual(
        await databases.app.monthlyExpenseOccurrence.findMany(),
        [],
      );
      await assert.rejects(
        () => databases.app.$queryRaw`SELECT token FROM auth.session`,
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await databases.close();
    }
    // Corrupción detectada antes de crear otra base de restauración.
    await writeFile(
      path.join(backup, "database.dump.enc"),
      Buffer.from("corrupto"),
    );
    await assert.rejects(
      () =>
        restoreBackup({
          directory: backup,
          key,
          database: database.toString(),
          outputRoot: path.join(dir, "restores"),
        }),
      /integridad/,
    );
  } finally {
    if (restoredName) {
      const admin = new pg.Client({
        connectionString: adminUrl(h.config.databaseUrl).toString(),
      });
      await admin.connect();
      try {
        await admin.query(`DROP DATABASE ${pg.escapeIdentifier(restoredName)}`);
      } finally {
        await admin.end();
      }
    }
    await h.close();
    await rm(dir, { recursive: true, force: true });
  }
});
