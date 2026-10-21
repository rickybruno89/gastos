import { restoreBackup } from "./lib/local-backups.mjs";
const directory = process.argv[2];
if (!directory)
  throw new Error("Uso: npm run db:restore:verify -- .data/backups/backup-...");
try {
  const result = await restoreBackup({ directory });
  console.log(
    `Restauración verificada en ${result.database}; ${result.tables} tablas y archivos en ${result.filesDir}. Los envíos externos están deshabilitados: no se inicia ningún worker.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
