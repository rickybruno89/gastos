import { z } from "zod";

const databaseUrl = z
  .url()
  .refine(
    (value) => ["postgres:", "postgresql:"].includes(new URL(value).protocol),
    "Debe ser una conexión PostgreSQL",
  );
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  APP_ORIGIN: z.url(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  DATABASE_URL: databaseUrl,
  AUTH_DATABASE_URL: databaseUrl,
  BETTER_AUTH_SECRET: z.string().min(32),
  WORKER_DATABASE_URL: databaseUrl.optional(),
  MAIL_MODE: z.enum(["disabled", "capture", "smtp"]).optional(),
  MAIL_FROM: z.email().default("noreply@example.test"),
  MAIL_CAPTURE_DIR: z.string().min(1).default(".data/mail"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
});

export function parseConfig(env: Record<string, string | undefined>) {
  const result = schema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Configuración V2 inválida: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}. Revisá .env.local o las variables del entorno.`,
    );
  const value = result.data;
  const origin = new URL(value.APP_ORIGIN);
  if (
    origin.origin !== value.APP_ORIGIN ||
    !["http:", "https:"].includes(origin.protocol)
  )
    throw new Error(
      "APP_ORIGIN debe contener solo protocolo, host y puerto, sin ruta ni barra final.",
    );
  const googleConfigured = Boolean(
    value.GOOGLE_CLIENT_ID && value.GOOGLE_CLIENT_SECRET,
  );
  if (Boolean(value.GOOGLE_CLIENT_ID) !== Boolean(value.GOOGLE_CLIENT_SECRET))
    throw new Error(
      "Configurar ambas credenciales de Google o dejar ambas vacías en desarrollo.",
    );
  if (
    value.NODE_ENV === "production" &&
    (origin.protocol !== "https:" || !googleConfigured)
  )
    throw new Error(
      "Producción requiere APP_ORIGIN con HTTPS y Google configurado.",
    );
  if (
    new URL(value.DATABASE_URL).username ===
    new URL(value.AUTH_DATABASE_URL).username
  )
    throw new Error(
      "Autenticación y datos de la app requieren roles PostgreSQL distintos.",
    );
  const mailMode =
    value.MAIL_MODE ??
    (value.NODE_ENV === "production" ? "disabled" : "capture");
  if (
    mailMode === "smtp" &&
    (!value.SMTP_HOST ||
      !env.MAIL_FROM ||
      Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASSWORD))
  )
    throw new Error(
      "SMTP requiere host, remitente y credenciales completas si se usa autenticación.",
    );
  if (value.NODE_ENV === "production" && mailMode === "capture")
    throw new Error(
      "La captura de correos es exclusiva de desarrollo/pruebas.",
    );
  if (
    value.WORKER_DATABASE_URL &&
    [
      new URL(value.DATABASE_URL).username,
      new URL(value.AUTH_DATABASE_URL).username,
    ].includes(new URL(value.WORKER_DATABASE_URL).username)
  )
    throw new Error("El worker requiere un rol PostgreSQL separado.");
  return {
    workerDatabaseUrl: value.WORKER_DATABASE_URL,
    mail: {
      mode: mailMode,
      from: value.MAIL_FROM,
      captureDir: value.MAIL_CAPTURE_DIR,
      host: value.SMTP_HOST,
      port: value.SMTP_PORT,
      secure: value.SMTP_SECURE === "true",
      user: value.SMTP_USER,
      password: value.SMTP_PASSWORD,
    },
    mode: value.NODE_ENV,
    port: value.PORT,
    origin: origin.origin,
    trustProxyHops: value.TRUST_PROXY_HOPS,
    databaseUrl: value.DATABASE_URL,
    authDatabaseUrl: value.AUTH_DATABASE_URL,
    authSecret: value.BETTER_AUTH_SECRET,
    googleClientId: value.GOOGLE_CLIENT_ID,
    googleClientSecret: value.GOOGLE_CLIENT_SECRET,
    googleConfigured,
  };
}
export type AppConfig = ReturnType<typeof parseConfig>;
