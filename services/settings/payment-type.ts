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
    name?: string[];
  };
  message?: string | null;
};

const PaymentTypeSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, { message: "El nombre es requerido" }).toUpperCase(),
});

const CreatePaymentTypeSchema = PaymentTypeSchema.omit({ id: true });

export const createPaymentType = async (
  callbackUrl: string,
  _prevState: State,
  formData: FormData
): Promise<PaymentType | any> => {
  try {
    const validatedFields = CreatePaymentTypeSchema.safeParse({
      name: formData.get("name"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Error",
      };
    }

    const { name } = validatedFields.data;
    const userId = await getAuthUserId();

    const existingPaymentType = await prisma.paymentType.findFirst({
      where: {
        name,
        userId,
      },
    });

    if (existingPaymentType) {
      return {
        errors: { name: ["La forma de pago ya existe"] },
        message: "Error",
      };
    }

    await prisma.paymentType.create({
      data: {
        name: name,
        userId,
      },
    });
  } catch (error) {
    return {
      message: "Error en base de datos",
    };
  }
  revalidatePath(PAGES_URL.SETTINGS.BASE_PATH);
  revalidatePath(PAGES_URL.CREDIT_CARDS.CREATE);
  revalidatePath(PAGES_URL.EXPENSES.CREATE);
  redirect(callbackUrl);
};

export async function fetchPaymentType() {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.paymentType.findMany({
      where: {
        userId: await getAuthUserId(),
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar Formas de pago");
  }
}
