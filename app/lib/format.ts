import type { Currency } from "../../shared/domain/money";

export function formatMoney(amountMinor: string | bigint, currency: Currency) {
  const minor = BigInt(amountMinor);
  const sign = minor < 0n ? "-" : "";
  const absolute = minor < 0n ? -minor : minor;
  return `${sign}${currency === "USD" ? "US$" : "$"} ${new Intl.NumberFormat("es-AR").format(absolute / 100n)},${(absolute % 100n).toString().padStart(2, "0")}`;
}
// Acepta "1234,56", "1234.56" o "1.234,56"; devuelve minor units o null.
export function parseAmount(input: string) {
  const value = input.trim().replace(/\s/g, "");
  const normalized = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(value)
    ? value.replaceAll(".", "").replace(",", ".")
    : value.replace(",", ".");
  const match = /^(\d{1,13})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const minor =
    BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  return minor > 0n ? minor.toString() : null;
}
export function amountInput(amountMinor: string) {
  const minor = BigInt(amountMinor);
  const cents = minor % 100n;
  return cents
    ? `${minor / 100n},${cents.toString().padStart(2, "0")}`
    : `${minor / 100n}`;
}
// Número crudo ("1234.56") para alimentar un input con máscara.
export function amountRaw(amountMinor: string) {
  const minor = BigInt(amountMinor);
  const cents = minor % 100n;
  return cents
    ? `${minor / 100n}.${cents.toString().padStart(2, "0")}`
    : `${minor / 100n}`;
}
export function periodLabel(period: string) {
  const label = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
export function shortDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(".", "");
}
export function shortPeriod(period: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${period}-01T00:00:00Z`))
    .replace(".", "");
}
export function formatShare(bps: number) {
  const whole = Math.trunc(bps / 100);
  const cents = bps % 100;
  return `${whole}${cents ? `,${String(cents).padStart(2, "0")}` : ""}%`;
}
// "50", "33,33" o "12.5" → basis points; null si no es un porcentaje válido.
export function parseShare(input: string) {
  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const bps = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return bps >= 1 && bps <= 10_000 ? bps : null;
}
