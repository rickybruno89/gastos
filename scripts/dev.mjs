import { spawn } from "node:child_process";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const port = Number(process.env.PORT ?? 3000);
const env = {
  ...process.env,
  NODE_ENV: "development",
  API_DEV_PORT: String(port + 1),
};
const children = [
  spawn(process.execPath, ["--import", "tsx", "--watch", "server/index.ts"], {
    stdio: "inherit",
    env: { ...env, PORT: String(port + 1) },
  }),
  spawn(
    process.execPath,
    ["node_modules/@react-router/dev/bin.js", "dev", "--port", String(port)],
    { stdio: "inherit", env },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => stop());
for (const child of children) child.once("exit", (code) => stop(code ?? 1));
console.log(
  `GastApp local: ${process.env.APP_ORIGIN ?? `http://localhost:${port}`}`,
);
