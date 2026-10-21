export function localDatabase(value: string): URL;
export function adminUrl(database: string): URL;
export function createBackup(options?: {
  database?: string;
  outputRoot?: string;
  filesRoot?: string;
  key?: string;
  keep?: number;
}): Promise<string>;
export function restoreBackup(options: {
  directory: string;
  key?: string;
  database?: string;
  outputRoot?: string;
}): Promise<{ database: string; filesDir: string; tables: number }>;
