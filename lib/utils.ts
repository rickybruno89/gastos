import { Decimal } from "@prisma/client/runtime/library";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number | Decimal) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount as number);

export const removeCurrencyMaskFromInput = (amount: string) =>
  parseFloat(amount.replace("$", "").replace(/\./g, "").replace(",", "."));

export const formatLocaleDate = (date: Date) => {
  const adjustedDate = new Date(date.getTime() + 3 * 60 * 60 * 1000);

  return adjustedDate.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
  });
};
