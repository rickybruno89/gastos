export const DEFAULT_TIME_ZONE = "America/Argentina/Tucuman";

function parsePeriod(period: string) {
  const match = /^([0-9]{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match || Number(match[1]) === 0)
    throw new Error("El período debe tener formato YYYY-MM y año válido.");
  return { year: Number(match[1]), month: Number(match[2]) };
}
export function dueDateForPeriod(period: string, dueDay: number) {
  const { year, month } = parsePeriod(period);
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
    throw new Error("Día de vencimiento inválido.");
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const max = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
  return `${period}-${String(Math.min(dueDay, max)).padStart(2, "0")}`;
}
export function occursInPeriod(
  period: string,
  anchor: string,
  intervalMonths: 1 | 2,
) {
  const target = parsePeriod(period),
    start = parsePeriod(anchor);
  if (intervalMonths !== 1 && intervalMonths !== 2)
    throw new Error("Frecuencia inválida.");
  const difference =
    (target.year - start.year) * 12 + target.month - start.month;
  return difference >= 0 && difference % intervalMonths === 0;
}
export function addMonths(period: string, months: number) {
  const { year, month } = parsePeriod(period);
  const index = year * 12 + month - 1 + months;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}
export function todayIn(timeZone: string, now = new Date()) {
  // en-CA formatea como YYYY-MM-DD en la zona horaria del usuario.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}
