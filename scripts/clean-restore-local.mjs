import { rm } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { adminUrl } from "./lib/local-backups.mjs";
const name = process.argv[2];
if (!/^gastapp_restore_[a-f0-9]{16}$/.test(name ?? ""))
  throw new Error(
    "Uso: npm run db:restore:clean -- gastapp_restore_<id>. Solo admite copias aisladas creadas por la verificación.",
  );
const admin = new pg.Client({
  connectionString: adminUrl(process.env.MIGRATION_DATABASE_URL).toString(),
});
await admin.connect();
try {
  await admin.query(`DROP DATABASE ${pg.escapeIdentifier(name)}`);
  await rm(path.join(".data/restores", name), { recursive: true, force: true });
  console.log("Copia aislada de verificación eliminada.");
} finally {
  await admin.end();
}
