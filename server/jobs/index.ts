import { config as loadEnv } from "dotenv";
import { parseConfig } from "../config";
import { createDatabases } from "../persistence/database";
import {
  workerPool,
  scheduleReminders,
  deliverBatch,
  cleanupIdempotency,
} from "./worker";
loadEnv({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });
const config = parseConfig(process.env),
  databases = createDatabases(config),
  pool = workerPool(config);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    stopping = true;
  });
try {
  if (process.argv.includes("--retry-failed")) {
    const result = await pool.query(
      `UPDATE public."NotificationJob" SET status='PENDING',attempts=0,"nextAttemptAt"=now(),"lastError"=NULL WHERE status='DEAD'`,
    );
    console.log(JSON.stringify({ requeued: result.rowCount }));
  } else
    do {
      let queued = 0;
      try {
        if (config.mail.mode !== "disabled")
          queued = await scheduleReminders(pool, databases);
      } catch {
        console.error(
          "Falló la preparación de recordatorios. Se mantiene el envío de la cola existente.",
        );
        if (process.argv.includes("--once")) process.exitCode = 1;
      }
      try {
        const delivery = await deliverBatch(pool, databases, config);
        const cleaned = await cleanupIdempotency(pool);
        console.log(JSON.stringify({ queued, ...delivery, cleaned }));
      } catch {
        console.error(
          "Falló la entrega o limpieza de la cola. Revisá la base y el worker.",
        );
        if (process.argv.includes("--once")) process.exitCode = 1;
      }
      if (process.argv.includes("--once") || stopping) break;
      // Espera interrumpible; nunca solapa ciclos de este proceso.
      await new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          process.off("SIGINT", done);
          process.off("SIGTERM", done);
          resolve();
        };
        const timer = setTimeout(done, 60_000);
        process.once("SIGINT", done);
        process.once("SIGTERM", done);
      });
    } while (!stopping);
} finally {
  await pool.end();
  await databases.close();
}
