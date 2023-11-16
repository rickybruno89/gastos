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
    creditCardName?: string[];
    taxesPercent?: string[];
    paymentTypeId?: string[];
    paymentSourceId?: string[];
  };
  message?: string | null;
};

const CreditCardSchema = z.object({
  id: z.string().cuid(),
  creditCardName: z
    .string()
    .min(1, { message: "El nombre es requerido" })
    .toUpperCase(),
  taxesPercent: z.coerce
    .number()
    .gt(0, { message: "El porcentaje tiene que ser mayor que 0" }),
  paymentTypeId: z.string({
    invalid_type_error: "Por favor seleccione una forma de pago",
  }),
  paymentSourceId: z.string({
    invalid_type_error: "Por favor seleccione un canal de pago",
  }),
});

const CreateCreditCardSchema = CreditCardSchema.omit({ id: true });

export const createCreditCard = async (
  _prevState: State,
  formData: FormData
): Promise<PaymentType | any> => {
  try {
    const validatedFields = CreateCreditCardSchema.safeParse({
      creditCardName: formData.get("creditCardName"),
      taxesPercent: formData.get("taxesPercent"),
      paymentTypeId: formData.get("paymentTypeId"),
      paymentSourceId: formData.get("paymentSourceId"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Error",
      };
    }

    const { creditCardName, taxesPercent, paymentTypeId, paymentSourceId } =
      validatedFields.data;
    console.log(
      "🚀 ~ file: credit-card.ts:60 ~ validatedFields.data:",
      validatedFields.data
    );
    const userId = await getAuthUserId();

    const existingCreditCard = await prisma.creditCardExpense.findFirst({
      where: {
        name: creditCardName,
        userId,
      },
    });

    if (existingCreditCard) {
      return {
        errors: { creditCardName: ["La Tarjeta de crédito ya existe"] },
        message: "Error",
      };
    }

    await prisma.creditCardExpense.create({
      data: {
        name: creditCardName,
        taxesPercent: taxesPercent,
        paymentTypeId: paymentTypeId,
        paymentSourceId: paymentSourceId,
        userId,
      },
    });
  } catch (error) {
    return {
      message: "Error en base de datos",
    };
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.BASE_PATH);
  redirect(PAGES_URL.CREDIT_CARDS.BASE_PATH);
};

export async function fetchCreditCards() {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCardExpense.findMany({
      where: {
        userId: await getAuthUserId(),
      },
      include: {
        paymentSource: true,
        paymentType: true,
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar Tarjetas de créditos");
  }
}

export async function fetchCreditCardWithItems(id: string) {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCardExpense.findFirst({
      where: {
        userId: await getAuthUserId(),
        id,
      },
      include: {
        creditCardExpenseItems: true,
        paymentSource: true,
        paymentType: true,
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar Tarjetas de créditos");
  }
}

export async function fetchCreditCardName(id: string) {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCardExpense.findFirst({
      where: {
        userId: await getAuthUserId(),
        id,
      },
      select: {
        name: true,
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar Tarjetas de créditos");
  }
}

// export async function updateInvoice(
//   id: string,
//   prevState: State,
//   formData: FormData
// ) {
//   const validatedFields = UpdateInvoice.safeParse({
//     customerId: formData.get("customerId"),
//     amount: formData.get("amount"),
//     status: formData.get("status"),
//   });

//   if (!validatedFields.success) {
//     return {
//       errors: validatedFields.error.flatten().fieldErrors,
//       message: "Missing Fields. Failed to Update Invoice.",
//     };
//   }

//   const { customerId, amount, status } = validatedFields.data;
//   const amountInCents = amount * 100;

//   try {
//     await sql`
//       UPDATE invoices
//       SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
//       WHERE id = ${id}
//     `;
//   } catch (error) {
//     return { message: "Database Error: Failed to Update Invoice." };
//   }

//   revalidatePath("/dashboard/invoices");
//   redirect("/dashboard/invoices");
// }

// export async function deleteInvoice(id: string) {
//   try {
//     await sql`DELETE FROM invoices WHERE id = ${id}`;
//   } catch (error) {
//     return {
//       message: "Database Error: Failed to Create Invoice.",
//     };
//   }
//   revalidatePath("/dashboard/invoices");
// }

// export async function authenticate() {
//   try {
//     await signIn("google");
//   } catch (error) {
//     if ((error as Error).message.includes("CredentialsSignin")) {
//       return "CredentialSignin";
//     }
//     throw error;
//   }
// }
