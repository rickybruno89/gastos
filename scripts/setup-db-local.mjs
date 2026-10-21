import { userInfo } from "node:os";
import pg from "pg";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
// Postgres.app crea un superusuario con el nombre del usuario de macOS.
const port = process.env.POSTGRES_PORT ?? "5555";
const database = process.env.POSTGRES_DB ?? "gastappv2";
const admin = new URL(
  process.env.LOCAL_ADMIN_DATABASE_URL ??
    `postgresql://${encodeURIComponent(userInfo().username)}@127.0.0.1:${port}/postgres`,
);
if (!["127.0.0.1", "localhost", "[::1]"].includes(admin.hostname))
  throw new Error("db:setup solo admite un PostgreSQL local.");
const roles = [
  [process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD, "CREATEDB"],
  ["gastapp_auth", process.env.AUTH_DB_PASSWORD, "NOCREATEDB NOINHERIT"],
  ["gastapp_worker", process.env.WORKER_DB_PASSWORD, "NOCREATEDB NOINHERIT"],
  ["gastapp_app", process.env.APP_DB_PASSWORD, "NOCREATEDB NOINHERIT"],
];
if (roles.some(([name, password]) => !name || !password))
  throw new Error(
    "Faltan credenciales en .env.local. Ejecutá npm run setup:local.",
  );
const client = new pg.Client({ connectionString: admin.toString() });
await client.connect();
try {
  for (const [name, password, options] of roles) {
    const exists = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [name],
    );
    await client.query(
      `${exists.rowCount ? "ALTER" : "CREATE"} ROLE ${pg.escapeIdentifier(name)} LOGIN PASSWORD ${pg.escapeLiteral(password)} NOSUPERUSER NOCREATEROLE NOBYPASSRLS ${options}`,
    );
  }
  const owner = pg.escapeIdentifier(process.env.POSTGRES_USER);
  // --reset recrea la base: necesario al regenerar la migración única init.
  if (process.argv.includes("--reset")) {
    await client.query(
      `DROP DATABASE IF EXISTS ${pg.escapeIdentifier(database)} WITH (FORCE)`,
    );
    console.log(`Base ${database} eliminada.`);
  }
  const found = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [database],
  );
  if (!found.rowCount)
    await client.query(
      `CREATE DATABASE ${pg.escapeIdentifier(database)} OWNER ${owner} TEMPLATE template0`,
    );
  console.log(
    `Base ${database} y roles listos en 127.0.0.1:${port}. Siguiente: npm run db:migrate`,
  );
} finally {
  await client.end();
}
