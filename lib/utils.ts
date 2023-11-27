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

export const formatLocaleDate = (date: string) => {
  const [year, month] = date.split("-");
  const adjustedDate = new Date(`${year}-${month}-01T00:00:00`);

  return adjustedDate.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
  });
};

export const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  let month = now.getMonth() + 1;

  const formattedMonth = month < 10 ? `0${month}` : `${month}`;

  return `${year}-${formattedMonth}`;
};
