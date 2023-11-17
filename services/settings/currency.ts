"use server";
import { PaymentType } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { PAGES_URL } from "@/lib/routes";

type State = {
  errors?: {
    currency_name?: string[];
  };
  message?: string | null;
};

const CurrencySchema = z.object({
  id: z.string().cuid(),
  currency_name: z
    .string()
    .min(1, { message: "El nombre es requerido" })
    .toUpperCase(),
});

const CreateCurrencySchema = CurrencySchema.omit({ id: true });

export const createCurrency = async (
  callbackUrl: string,
  _prevState: State,
  formData: FormData
) => {
  try {
    const validatedFields = CreateCurrencySchema.safeParse({
      currency_name: formData.get("currency_name"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Error",
      };
    }

    const { currency_name } = validatedFields.data;
    const userId = await getAuthUserId();

    const existingCurrency = await prisma.currency.findFirst({
      where: {
        name: currency_name,
        userId,
      },
    });

    if (existingCurrency) {
      return {
        errors: { currency_name: ["La moneda ya existe"] },
        message: "Error",
      };
    }
    await prisma.currency.create({
      data: {
        name: currency_name,
        userId,
      },
    });
  } catch (error) {
    return {
      message: "Error en base de datos",
    };
  }
  revalidatePath(PAGES_URL.SETTINGS.BASE_PATH);
  redirect(callbackUrl);
};

export async function fetchCurrency() {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.currency.findMany({
      where: {
        userId: await getAuthUserId(),
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar las monedas");
  }
}
