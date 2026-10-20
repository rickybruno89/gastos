import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
if (existsSync(".env.local")) {
  console.log(".env.local ya existe; se conserva su contenido.");
} else {
  const secrets = Array.from({ length: 4 }, () =>
    randomBytes(32).toString("hex"),
  );
  let content = readFileSync(".env.example", "utf8");
  const values = {
    POSTGRES_PASSWORD: secrets[0],
    AUTH_DB_PASSWORD: secrets[1],
    APP_DB_PASSWORD: secrets[2],
    BETTER_AUTH_SECRET: secrets[3],
    MIGRATION_DATABASE_URL: `postgresql://gastapp_owner:${secrets[0]}@127.0.0.1:5555/gastappv2`,
    AUTH_DATABASE_URL: `postgresql://gastapp_auth:${secrets[1]}@127.0.0.1:5555/gastappv2`,
    DATABASE_URL: `postgresql://gastapp_app:${secrets[2]}@127.0.0.1:5555/gastappv2`,
  };
  for (const [key, value] of Object.entries(values))
    content = content.replace(
      new RegExp(`^${key}=.*$`, "m"),
      `${key}=${value}`,
    );
  writeFileSync(".env.local", content, { mode: 0o600, flag: "wx" });
  console.log(
    ".env.local creada con credenciales locales nuevas. La .env de V1 no se modificó.",
  );
}
console.log(
  "Próximos pasos: npm run db:setup → npm run db:migrate → npm run dev",
);
console.log(
  "Para Google: completar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local.",
);
