"use server";
import prisma from "@/lib/prisma";
import { unstable_noStore as noStore } from "next/cache";

export async function fetchCurrency() {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.currency.findMany({});
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar las monedas");
  }
}
