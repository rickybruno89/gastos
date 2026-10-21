import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import net from "node:net";
import assert from "node:assert/strict";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const probe = net.createServer();
await new Promise((resolve, reject) => {
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", resolve);
});
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const origin = `http://localhost:${port}`;
const container = `gastapp-smoke-${process.pid}`;
const envFile = `.data/docker-smoke-${process.pid}.env`;
const forContainer = (value) => {
  const url = new URL(value);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.equal(url.pathname, "/gastappv2");
  // El contenedor llega a Postgres.app del Mac a través del host de Docker.
  url.hostname = "host.docker.internal";
  return url.toString();
};
const values = {
  NODE_ENV: "test",
  PORT: "3000",
  APP_ORIGIN: origin,
  TRUST_PROXY_HOPS: "0",
  DATABASE_URL: forContainer(process.env.DATABASE_URL),
  AUTH_DATABASE_URL: forContainer(process.env.AUTH_DATABASE_URL),
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  GOOGLE_CLIENT_ID: "",
  GOOGLE_CLIENT_SECRET: "",
};
mkdirSync(".data", { recursive: true });
writeFileSync(
  envFile,
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600, flag: "wx" },
);
function docker(args, silent = false) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    stdio: silent ? "pipe" : "inherit",
  });
  if (result.status !== 0)
    throw new Error(
      "Falló la comprobación Docker. Revisá el estado de OrbStack y la base local.",
    );
  return result.stdout;
}
try {
  docker(
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      container,
      "--add-host",
      "host.docker.internal:host-gateway",
      "--publish",
      `127.0.0.1:${port}:3000`,
      "--env-file",
      envFile,
      "gastapp:v2-local",
    ],
    true,
  );
  let healthy = false;
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(`${origin}/healthz`);
      if (response.status === 200) {
        healthy = true;
        break;
      }
    } catch {
      /* Startup may still be in progress. */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(
    healthy,
    "La imagen debe responder al healthcheck con la base local.",
  );
  for (const route of [
    "/",
    "/acceso",
    "/cuenta",
    "/compartidos",
    "/deudas",
    "/tarjetas",
  ]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    const html = await response.text();
    for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
      const asset = await fetch(`${origin}${match[1]}`);
      assert.equal(asset.status, 200, match[1]);
      assert.doesNotMatch(asset.headers.get("content-type"), /text\/html/);
    }
    assert.ok(response.headers.get("content-security-policy"));
  }
  assert.equal((await fetch(`${origin}/api/v2/me`)).status, 401);
  assert.equal((await fetch(`${origin}/api/v2/cards`)).status, 401);
  assert.equal((await fetch(`${origin}/api/not-found`)).status, 404);
  assert.equal((await fetch(`${origin}/assets/not-found.js`)).status, 404);
  docker(["restart", container], true);
  let restarted = false;
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${origin}/healthz`)).status === 200) {
        restarted = true;
        break;
      }
    } catch {
      /* Wait for restart. */
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  assert.ok(
    restarted,
    "La imagen vuelve a funcionar tras reiniciar sin modificar schema.",
  );
  console.log(
    "Imagen Docker validada: arranque, PostgreSQL, rutas SPA, assets, API, headers y reinicio.",
  );
} catch (error) {
  const logs = spawnSync("docker", ["logs", "--tail", "40", container], {
    encoding: "utf8",
  });
  console.error(logs.stderr || logs.stdout);
  throw error;
} finally {
  spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  unlinkSync(envFile);
}
