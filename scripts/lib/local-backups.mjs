import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import {
  mkdir,
  writeFile,
  readFile,
  open,
  rm,
  readdir,
  lstat,
  mkdtemp,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir, userInfo } from "node:os";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import pg from "pg";
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const format = "gastapp-local-backup-v1";
export function localDatabase(value) {
  const url = new URL(value);
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !/^\/(gastappv2|gastapp_test_[a-f0-9]+|gastapp_restore_[a-f0-9]+)$/.test(
      url.pathname,
    )
  )
    throw new Error("Esta herramienta solo admite bases locales de GastApp.");
  return url;
}
export function adminUrl(database) {
  const target = localDatabase(database);
  const admin = new URL(
    process.env.LOCAL_ADMIN_DATABASE_URL ??
      `postgresql://${encodeURIComponent(userInfo().username)}@${target.hostname}:${target.port || 5555}/postgres`,
  );
  if (
    !["127.0.0.1", "localhost", "[::1]"].includes(admin.hostname) ||
    admin.hostname !== target.hostname ||
    admin.port !== target.port
  )
    throw new Error(
      "El administrador debe pertenecer al mismo PostgreSQL local.",
    );
  admin.pathname = target.pathname;
  return admin;
}
function encryptionKey(value = process.env.BACKUP_ENCRYPTION_KEY) {
  if (!/^[a-f0-9]{64}$/i.test(value ?? ""))
    throw new Error(
      "BACKUP_ENCRYPTION_KEY debe tener 32 bytes hexadecimales. Ejecutá setup:local y guardá la clave fuera de los backups.",
    );
  return Buffer.from(value, "hex");
}
function binary(name) {
  const dir =
    process.env.POSTGRES_BIN ??
    (existsSync("/Applications/Postgres.app/Contents/Versions/18/bin")
      ? "/Applications/Postgres.app/Contents/Versions/18/bin"
      : null);
  return dir ? path.join(dir, name) : name;
}
async function pgTool(name, args, url) {
  await new Promise((resolve, reject) => {
    const child = spawn(binary(name), args, {
      env: {
        ...process.env,
        PGHOST: url.hostname,
        PGPORT: url.port || "5555",
        PGUSER: decodeURIComponent(url.username),
        PGPASSWORD: decodeURIComponent(url.password),
        PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
      },
      stdio: ["ignore", "ignore", "pipe"],
    });
    // No se imprimen parámetros, credenciales ni contenido del dump.
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      if (stderr.length < 2000) stderr += chunk;
    });
    child.once("error", () =>
      reject(
        new Error(
          `No se pudo ejecutar ${name}. Instalá los clientes PostgreSQL 18 o configurá POSTGRES_BIN.`,
        ),
      ),
    );
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${name} falló. Verificá versión del cliente, permisos y espacio disponible. Código ${code}. ${stderr.includes("row-level security") ? "El backup requiere un rol administrativo local con acceso de lectura completo." : ""}`,
            ),
          ),
    );
  });
}
async function checksum(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function encrypt(source, dest, key) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  await writeFile(dest, Buffer.alloc(28), { mode: 0o600, flag: "wx" });
  await pipeline(
    createReadStream(source),
    cipher,
    createWriteStream(dest, { flags: "r+", start: 28 }),
  );
  const f = await open(dest, "r+");
  try {
    await f.write(Buffer.concat([iv, cipher.getAuthTag()]), 0, 28, 0);
  } finally {
    await f.close();
  }
}
async function decrypt(source, dest, key) {
  const f = await open(source, "r"),
    header = Buffer.alloc(28);
  try {
    const read = await f.read(header, 0, 28, 0);
    if (read.bytesRead !== 28) throw new Error("Backup incompleto.");
  } finally {
    await f.close();
  }
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(0, 12));
  decipher.setAuthTag(header.subarray(12));
  await pipeline(
    createReadStream(source, { start: 28 }),
    decipher,
    createWriteStream(dest, { mode: 0o600, flags: "wx" }),
  );
}
async function fingerprint(client) {
  const tables = (
    await client.query(
      "SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN('public','auth') ORDER BY schemaname,tablename",
    )
  ).rows;
  const result = [];
  for (const t of tables) {
    const table = `${pg.escapeIdentifier(t.schemaname)}.${pg.escapeIdentifier(t.tablename)}`;
    const row = (
      await client.query(
        `SELECT COUNT(*)::text AS count, md5(COALESCE(string_agg(hash,'' ORDER BY hash),'')) AS digest FROM(SELECT md5(row_to_json(t)::text) AS hash FROM ${table} t) rows`,
      )
    ).rows[0];
    result.push({ table, ...row });
  }
  const security = (
    await client.query(
      `SELECT n.nspname AS schema,c.relname AS name,r.rolname AS owner,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_roles r ON r.oid=c.relowner WHERE c.relkind='r' AND n.nspname IN('public','auth') ORDER BY n.nspname,c.relname`,
    )
  ).rows;
  return { tables: result, security };
}
async function privateFiles(root, relative = "") {
  if (!existsSync(root)) return [];
  const result = [];
  for (const name of await readdir(path.join(root, relative))) {
    const rel = path.join(relative, name),
      file = path.join(root, rel),
      stat = await lstat(file);
    if (stat.isSymbolicLink())
      throw new Error("No se admiten enlaces simbólicos en archivos privados.");
    if (stat.isDirectory()) result.push(...(await privateFiles(root, rel)));
    else if (stat.isFile()) result.push(rel);
    else throw new Error("Archivo privado de tipo no soportado.");
  }
  return result.sort();
}
export async function createBackup({
  database = process.env.MIGRATION_DATABASE_URL,
  outputRoot = ".data/backups",
  filesRoot = ".data/private-files",
  key: rawKey = process.env.BACKUP_ENCRYPTION_KEY,
  keep = 14,
} = {}) {
  const url = adminUrl(database),
    key = encryptionKey(rawKey),
    createdAt = new Date().toISOString();
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  const dir = path.resolve(
    outputRoot,
    `backup-${createdAt.replaceAll(":", "-")}-${randomBytes(4).toString("hex")}`,
  );
  await mkdir(dir, { mode: 0o700 });
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    const snapshot = (await client.query("SELECT pg_export_snapshot() AS id"))
      .rows[0].id;
    const original = path.join(dir, "database.dump");
    await writeFile(original, "", { mode: 0o600, flag: "wx" });
    await pgTool(
      "pg_dump",
      ["--format=custom", "--snapshot", snapshot, "--file", original],
      url,
    );
    const databaseFingerprint = await fingerprint(client);
    await client.query("COMMIT");
    const dumpChecksum = await checksum(original);
    await encrypt(original, path.join(dir, "database.dump.enc"), key);
    await rm(original);
    const files = [];
    await mkdir(path.join(dir, "private"), { mode: 0o700 });
    for (const relative of await privateFiles(filesRoot)) {
      const entry = `${files.length}.enc`,
        source = path.join(filesRoot, relative),
        hash = await checksum(source);
      await encrypt(source, path.join(dir, "private", entry), key);
      // Los archivos del producto aún no tienen escritores en Fase 6. Si cambian
      // durante la copia, se aborta; PDF requerirá coordinar escrituras.
      if (hash !== (await checksum(source)))
        throw new Error(
          "Un archivo cambió durante el backup. Repetí con las escrituras pausadas.",
        );
      files.push({ relative, entry, checksum: hash });
    }
    const manifest = {
      format,
      createdAt,
      sourceDatabase: url.pathname.slice(1),
      dumpChecksum,
      databaseFingerprint,
      files,
    };
    const plain = path.join(dir, "manifest.json");
    await writeFile(plain, JSON.stringify(manifest), {
      mode: 0o600,
      flag: "wx",
    });
    await encrypt(plain, path.join(dir, "manifest.json.enc"), key);
    await rm(plain);
    await writeFile(
      path.join(dir, "backup.json"),
      JSON.stringify(
        {
          format,
          createdAt,
          algorithm: "AES-256-GCM",
          dump: await checksum(path.join(dir, "database.dump.enc")),
          manifest: await checksum(path.join(dir, "manifest.json.enc")),
        },
        null,
        2,
      ) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    if (keep > 0) {
      const completed = [];
      for (const name of await readdir(outputRoot)) {
        if (!/^backup-[0-9T.Z-]+-[a-f0-9]{8}$/.test(name)) continue;
        const candidate = path.join(outputRoot, name);
        if (!(await lstat(candidate)).isDirectory()) continue;
        try {
          const meta = JSON.parse(
            await readFile(path.join(candidate, "backup.json"), "utf8"),
          );
          if (meta.format === format)
            completed.push({ candidate, createdAt: meta.createdAt });
        } catch {
          /* Una copia incompleta se conserva para investigar. */
        }
      }
      completed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const entry of completed.slice(keep))
        await rm(entry.candidate, { recursive: true });
    }
    return dir;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    await rm(dir, { recursive: true, force: true });
    throw error;
  } finally {
    await client.end();
  }
}
export async function restoreBackup({
  directory,
  key: rawKey = process.env.BACKUP_ENCRYPTION_KEY,
  database = process.env.MIGRATION_DATABASE_URL,
  outputRoot = ".data/restores",
}) {
  const key = encryptionKey(rawKey),
    dir = path.resolve(directory),
    meta = JSON.parse(await readFile(path.join(dir, "backup.json"), "utf8"));
  if (
    meta.format !== format ||
    meta.dump !== (await checksum(path.join(dir, "database.dump.enc"))) ||
    meta.manifest !== (await checksum(path.join(dir, "manifest.json.enc")))
  )
    throw new Error("El backup no supera la verificación de integridad.");
  const temp = await mkdtemp(path.join(tmpdir(), "gastapp-restore-"));
  const url = adminUrl(database),
    target = `gastapp_restore_${randomBytes(8).toString("hex")}`,
    admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  let created = false;
  const filesDir = path.resolve(outputRoot, target);
  try {
    await decrypt(
      path.join(dir, "manifest.json.enc"),
      path.join(temp, "manifest.json"),
      key,
    );
    const manifest = JSON.parse(
      await readFile(path.join(temp, "manifest.json"), "utf8"),
    );
    if (manifest.format !== format) throw new Error("Manifiesto inválido.");
    await decrypt(
      path.join(dir, "database.dump.enc"),
      path.join(temp, "database.dump"),
      key,
    );
    if (
      (await checksum(path.join(temp, "database.dump"))) !==
      manifest.dumpChecksum
    )
      throw new Error("El dump no coincide con el manifiesto.");
    await admin.query(
      `CREATE DATABASE ${pg.escapeIdentifier(target)} OWNER gastapp_owner TEMPLATE template0`,
    );
    created = true;
    const targetUrl = new URL(url);
    targetUrl.pathname = `/${target}`;
    // Conserva propietarios, grants, RLS, triggers y constraints del dump.
    await pgTool(
      "pg_restore",
      [
        "--dbname",
        target,
        "--exit-on-error",
        "--single-transaction",
        path.join(temp, "database.dump"),
      ],
      targetUrl,
    );
    const restored = new pg.Client({ connectionString: targetUrl.toString() });
    await restored.connect();
    try {
      await restored.query("SET TIME ZONE 'UTC'");
      if (
        JSON.stringify(await fingerprint(restored)) !==
        JSON.stringify(manifest.databaseFingerprint)
      )
        throw new Error(
          "La base restaurada no coincide en filas, contenido o permisos con el manifiesto.",
        );
    } finally {
      await restored.end();
    }
    await mkdir(filesDir, { recursive: true, mode: 0o700 });
    for (const file of manifest.files) {
      const dest = path.resolve(filesDir, file.relative);
      if (
        !dest.startsWith(filesDir + path.sep) ||
        !/^\d+\.enc$/.test(file.entry)
      )
        throw new Error("Ruta de archivo inválida en el manifiesto.");
      await mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
      await decrypt(path.join(dir, "private", file.entry), dest, key);
      if ((await checksum(dest)) !== file.checksum)
        throw new Error("Un archivo restaurado no coincide con el manifiesto.");
    }
    return {
      database: target,
      filesDir,
      tables: manifest.databaseFingerprint.tables.length,
    };
  } catch (error) {
    if (created)
      await admin.query(`DROP DATABASE ${pg.escapeIdentifier(target)}`);
    await rm(filesDir, { recursive: true, force: true });
    throw error;
  } finally {
    await admin.end();
    await rm(temp, { recursive: true, force: true });
  }
}
