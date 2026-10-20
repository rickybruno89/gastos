import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import express from "express";
import { config as loadEnv } from "dotenv";
import { parseConfig } from "./config";
import { createDatabases } from "./persistence/database";
import { createApp, errorHandler } from "./app";

loadEnv({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const config = parseConfig(process.env);
const databases = createDatabases(config);
const { app } = createApp(config, databases);
if (config.mode !== "development") {
  const client = path.resolve("build/client");
  const html = await readFile(path.join(client, "index.html"), "utf8");
  const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .filter((match) => match[1])
    .map(
      (match) =>
        `'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`,
    );
  app.use((_req, res, next) => {
    res.set(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'self' ${hashes.join(" ")}; style-src 'self'; img-src 'self' https://lh3.googleusercontent.com data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`,
    );
    next();
  });
  app.use(
    "/assets",
    express.static(path.join(client, "assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use("/assets", (_req, res) => {
    res.status(404).type("text").send("Archivo no encontrado.");
  });
  app.use(express.static(client, { index: false, maxAge: "1h" }));
  app.get("/{*path}", (_req, res) => {
    res.set("Cache-Control", "no-cache").type("html").send(html);
  });
}
app.use(errorHandler);
const server = app.listen(config.port, "0.0.0.0", () =>
  console.log(`GastApp API lista en el puerto ${config.port}.`),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    server.close(() => {
      void databases.close().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
