import { z } from "zod";

z.config({ jitless: true });

export const currencySchema = z.enum(["ARS", "USD"]);
export const periodSchema = z
  .string()
  .regex(/^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$/, "Usá un período YYYY-MM.");
export const dateSchema = z.iso.date();
// BIGINT en minor units, serializado como string para no perder precisión.
export const amountMinorSchema = z
  .string()
  .regex(/^[1-9][0-9]{0,14}$/, "El importe debe ser mayor a cero.");
export const dueDaySchema = z.number().int().min(1).max(31);
export const versionSchema = z.number().int().min(1);
export const intervalMonthsSchema = z.union([z.literal(1), z.literal(2)]);
