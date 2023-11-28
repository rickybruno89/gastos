"use server";
import { PaymentType } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { BASE_PATH, PAGES_URL } from "@/lib/routes";
import { removeCurrencyMaskFromInput } from "@/lib/utils";

type CreateExpenseSummaryState = {
  errors?: {
    date?: string[];
  };
  message?: string | null;
};

const ExpenseSummarySchema = z.object({
  id: z.string().cuid(),
  date: z.string().min(1, { message: "Ingrese una fecha" }),
  amount: z.string().min(1, { message: "El total tiene que ser mayor que 0" }),
  paid: z.boolean(),
  sharedWith: z.string().array(),
  paymentTypeId: z.string({
    invalid_type_error: "Por favor seleccione una forma de pago",
  }),
  paymentSourceId: z.string({
    invalid_type_error: "Por favor seleccione un canal de pago",
  }),
});

const CreateExpenseSchema = ExpenseSummarySchema.omit({
  id: true,
  amount: true,
  paid: true,
  sharedWith: true,
  paymentTypeId: true,
  paymentSourceId: true,
});

export const createSummaryForMonth = async (
  _prevState: CreateExpenseSummaryState,
  formData: FormData
) => {
  try {
    const validatedFields = CreateExpenseSchema.safeParse({
      date: formData.get("date"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Error",
      };
    }

    const { date } = validatedFields.data;

    const userId = await getAuthUserId();

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        deleted: false,
      },
    });

    await prisma.expensePaymentSummary.createMany({
      data: expenses.map((expense) => ({
        expenseId: expense.id,
        date,
        amount: expense.amount,
        paid: false,
        paymentTypeId: expense.paymentTypeId,
        paymentSourceId: expense.paymentSourceId,
        userId,
      })),
    });
  } catch (error) {
    return {
      message: "Error en base de datos",
    };
  }
  revalidatePath(BASE_PATH);
  redirect("/");
};

export async function fetchExpenses() {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.expense.findMany({
      where: {
        userId: await getAuthUserId(),
      },
      include: {
        paymentSource: true,
        paymentType: true,
        sharedWith: true,
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar Tarjetas de créditos");
  }
}

export async function fetchCreditCardSummaryById(id: string) {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCardPaymentSummary.findUnique({
      where: {
        id,
      },
      include: {
        creditCard: true,
        itemHistoryPayment: {
          include: {
            creditCardExpenseItem: true,
          },
        },
      },
    });
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Error al cargar Tarjetas de créditos");
  }
}

type CreateCreditCardPaymentSummaryState = {
  errors?: {
    creditCardExpenseItems?: string[];
    date?: string[];
    paymentTypeId?: string[];
    paymentSourceId?: string[];
    totalAmount?: string[];
  };
  message?: string | null;
};

const CreditCardPaymentSummarySchema = z.object({
  id: z.string().cuid(),
  creditCardExpenseItems: z
    .object({
      id: z.string().cuid(),
      installmentsAmount: z.number(),
      installmentsPaid: z.number(),
    })
    .array(),
  date: z.string().min(1, { message: "Ingrese una fecha" }),
  paymentTypeId: z.string({
    invalid_type_error: "Por favor seleccione una forma de pago",
  }),
  paymentSourceId: z.string({
    invalid_type_error: "Por favor seleccione un canal de pago",
  }),
  totalAmount: z
    .string()
    .min(1, { message: "El total tiene que ser mayor que 0" }),
});

const CreateCreditCardPaymentSummarySchema =
  CreditCardPaymentSummarySchema.omit({
    id: true,
  });

export const createSummaryForCreditCard = async (
  creditCardId: string,
  _prevState: CreateCreditCardPaymentSummaryState,
  formData: FormData
) => {
  try {
    const creditCardExpenseItemsForm = formData.get(
      "creditCardExpenseItems"
    ) as string;
    const creditCardExpenseItemsParsed = JSON.parse(creditCardExpenseItemsForm);
    const validatedFields = CreateCreditCardPaymentSummarySchema.safeParse({
      creditCardExpenseItems: creditCardExpenseItemsParsed,
      date: formData.get("date"),
      paymentTypeId: formData.get("paymentTypeId"),
      paymentSourceId: formData.get("paymentSourceId"),
      totalAmount: formData.get("totalAmount"),
    });

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: "Error",
      };
    }

    const userId = await getAuthUserId();

    const {
      creditCardExpenseItems,
      date,
      paymentTypeId,
      paymentSourceId,
      totalAmount,
    } = validatedFields.data;

    const existingSummaryForCreditCard =
      await prisma.creditCardPaymentSummary.findFirst({
        where: {
          date,
          creditCardId,
        },
      });

    if (existingSummaryForCreditCard) {
      return {
        errors: {
          date: ["Ya existe un resumen para la fecha"],
        },
        message: "Error",
      };
    }

    await prisma.creditCardPaymentSummary.create({
      data: {
        amount: parseFloat(totalAmount),
        date,
        paid: false,
        paymentTypeId,
        paymentSourceId,
        creditCardId,
        userId,
        itemHistoryPayment: {
          createMany: {
            data: creditCardExpenseItems.map((item) => ({
              creditCardExpenseItemId: item.id,
              installmentsPaid: item.installmentsPaid + 1,
              installmentsAmount: item.installmentsAmount,
            })),
          },
        },
      },
    });

    await prisma.creditCardExpenseItem.updateMany({
      data: {
        installmentsPaid: {
          increment: 1,
        },
      },
      where: {
        recurrent: false,
        id: {
          in: creditCardExpenseItems.map((item) => item.id),
        },
      },
    });
    await prisma.creditCardExpenseItem.updateMany({
      data: {
        finished: true,
        finishedAt: new Date(),
      },
      where: {
        id: {
          in: creditCardExpenseItems.map((item) => item.id),
        },
        recurrent: false,
        installmentsPaid: {
          equals: prisma.creditCardExpenseItem.fields.installmentsQuantity,
        },
      },
    });
  } catch (error) {
    return {
      message: "Error en base de datos",
    };
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId));
  redirect(PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId));
};

export async function fetchSummariesForMonth(date: string) {
  noStore();
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCardPaymentSummary.findUnique({
      where: {
        id: "",
      },
      include: {
        creditCard: true,
        itemHistoryPayment: {
          include: {
            creditCardExpenseItem: true,
          },
        },
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
