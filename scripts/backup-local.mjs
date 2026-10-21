import { createBackup } from "./lib/local-backups.mjs";
try {
  console.log("Backup cifrado creado:", await createBackup());
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
