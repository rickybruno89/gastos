import { spawnSync } from "node:child_process";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const target = new URL(
  process.env.MIGRATION_DATABASE_URL ?? "postgresql://invalid/invalid",
);
if (
  !["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) ||
  target.pathname !== "/gastappv2"
) {
  throw new Error(
    "db:migrate solo admite la base local gastappv2. No se ejecutó ninguna migración.",
  );
}
const result = spawnSync(
  "npx",
  ["--no-install", "prisma", "migrate", "deploy"],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
