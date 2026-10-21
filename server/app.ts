import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler, type Request } from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { preferencesInputSchema } from "../shared/contracts/account";
import {
  getPreferences,
  updatePreferences,
  type Databases,
} from "./persistence/database";
import { createAuth } from "./auth/index";
import type { AppConfig } from "./config";
import { HttpError } from "./http";
import { monthlyExpensesRouter } from "./routes/monthly-expenses";
import { sharingRouter } from "./routes/sharing";
import { cardsRouter } from "./routes/cards";
import { debtsRouter } from "./routes/debts";

export { HttpError };

export function assertSameOrigin(
  request: Pick<Request, "get">,
  origin: string,
) {
  if (request.get("origin") !== origin)
    throw new HttpError(
      403,
      "INVALID_ORIGIN",
      "El origen de la solicitud no está permitido.",
    );
}

export function createApp(config: AppConfig, databases: Databases) {
  const app = express();
  const auth = createAuth(config, databases);
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxyHops);
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.set({
      "X-Request-ID": res.locals.requestId,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    if (req.path.startsWith("/api") || req.path === "/healthz")
      res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/healthz", async (_req, res) => {
    try {
      await Promise.all([
        databases.app
          .$queryRaw`SELECT "userId" FROM public."UserPreferences" LIMIT 0`,
        databases.auth.$queryRaw`SELECT id FROM auth."user" LIMIT 0`,
      ]);
      res.json({ status: "ok", version: "2.0.0" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  // Better Auth must receive the request stream before express.json().
  app.all("/api/auth/{*path}", toNodeHandler(auth));
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/v2/config", (_req, res) =>
    res.json({ data: { googleSignInEnabled: config.googleConfigured } }),
  );
  app.use("/api/v2", async (req, res, next) => {
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      returnHeaders: true,
      query: { disableCookieCache: true },
    });
    for (const cookie of result.headers.getSetCookie())
      res.append("Set-Cookie", cookie);
    if (!result.response)
      throw new HttpError(
        401,
        "UNAUTHENTICATED",
        "Ingresá con tu cuenta para continuar.",
      );
    res.locals.user = result.response.user;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method))
      assertSameOrigin(req, config.origin);
    next();
  });
  app.get("/api/v2/me", async (_req, res) => {
    const { id, name, email, image } = res.locals.user;
    const preferences = await getPreferences(databases.app, id);
    res.json({
      data: {
        id,
        name,
        email,
        image: image ?? null,
        preferences: {
          timeZone: preferences.timeZone,
          locale: preferences.locale,
        },
      },
    });
  });
  app.patch("/api/v2/me/preferences", async (req, res) => {
    const body = preferencesInputSchema.safeParse(req.body);
    if (!body.success)
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Revisá la zona horaria. Solo se permite modificar ese campo.",
      );
    const preferences = await updatePreferences(
      databases.app,
      res.locals.user.id,
      body.data,
    );
    res.json({
      data: { timeZone: preferences.timeZone, locale: preferences.locale },
    });
  });
  app.use("/api/v2", monthlyExpensesRouter(databases));
  app.use("/api/v2", sharingRouter(databases));
  app.use("/api/v2", debtsRouter(databases));
  app.use("/api/v2", cardsRouter(databases));
  app.use("/api", (_req, _res, next) =>
    next(new HttpError(404, "NOT_FOUND", "La ruta solicitada no existe.")),
  );
  return { app, auth };
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  const known = error instanceof HttpError;
  const malformed = error instanceof SyntaxError && "body" in error;
  const tooLarge =
    error instanceof Error &&
    "type" in error &&
    error.type === "entity.too.large";
  const status = known ? error.status : malformed ? 400 : tooLarge ? 413 : 500;
  if (status === 500)
    console.error(
      JSON.stringify({
        event: "request_failed",
        requestId: res.locals.requestId,
        type: error instanceof Error ? error.name : "UnknownError",
      }),
    );
  res.status(status).json({
    error: {
      code: known
        ? error.code
        : malformed
          ? "INVALID_JSON"
          : tooLarge
            ? "PAYLOAD_TOO_LARGE"
            : "INTERNAL_ERROR",
      message: known
        ? error.message
        : malformed
          ? "El JSON de la solicitud no es válido."
          : tooLarge
            ? "La solicitud supera el tamaño permitido."
            : "No pudimos completar la solicitud.",
      requestId: res.locals.requestId,
    },
  });
};
