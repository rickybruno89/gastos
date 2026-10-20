import { config } from "dotenv";
import { defineConfig } from "prisma/config";
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      "postgresql://build:build@127.0.0.1:5555/gastappv2",
  },
});
