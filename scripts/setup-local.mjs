import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
if (existsSync(".env.local")) {
  let existing = readFileSync(".env.local", "utf8");
  if (!/^WORKER_DB_PASSWORD=/m.test(existing)) {
    const password = randomBytes(32).toString("hex");
    const match = /^DATABASE_URL=(.+)$/m.exec(existing);
    const url = new URL(match?.[1] ?? "postgresql://invalid/invalid");
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      url.pathname !== "/gastappv2"
    )
      throw new Error("setup:local solo configura gastappv2 en localhost.");
    url.username = "gastapp_worker";
    url.password = password;
    existing += `\nWORKER_DB_PASSWORD=${password}\nWORKER_DATABASE_URL=${url}\n`;
  }
  if (!/^BACKUP_ENCRYPTION_KEY=/m.test(existing))
    existing += `BACKUP_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}\n`;
  writeFileSync(".env.local", existing, { mode: 0o600 });
  console.log(
    ".env.local conservada; se completaron las claves locales nuevas si faltaban.",
  );
} else {
  const secrets = Array.from({ length: 4 }, () =>
    randomBytes(32).toString("hex"),
  );
  let content = readFileSync(".env.example", "utf8");
  const values = {
    WORKER_DB_PASSWORD: randomBytes(32).toString("hex"),
    BACKUP_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    POSTGRES_PASSWORD: secrets[0],
    AUTH_DB_PASSWORD: secrets[1],
    APP_DB_PASSWORD: secrets[2],
    BETTER_AUTH_SECRET: secrets[3],
    MIGRATION_DATABASE_URL: `postgresql://gastapp_owner:${secrets[0]}@127.0.0.1:5555/gastappv2`,
    AUTH_DATABASE_URL: `postgresql://gastapp_auth:${secrets[1]}@127.0.0.1:5555/gastappv2`,
    DATABASE_URL: `postgresql://gastapp_app:${secrets[2]}@127.0.0.1:5555/gastappv2`,
  };
  values.WORKER_DATABASE_URL = `postgresql://gastapp_worker:${values.WORKER_DB_PASSWORD}@127.0.0.1:5555/gastappv2`;
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
