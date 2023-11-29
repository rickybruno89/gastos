'use server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { removeCurrencyMaskFromInput } from '@/lib/utils'

type CreateExpenseState = {
  errors?: {
    description?: string[]
    notes?: string[]
    amount?: string[]
    sharedWith?: string[]
    currencyId?: string[]
    paymentTypeId?: string[]
    paymentSourceId?: string[]
  }
  message?: string | null
}

const ExpenseSchema = z.object({
  id: z.string().cuid(),
  description: z.string().toUpperCase().min(1, { message: 'Ingrese una descripción' }),
  notes: z.string().toUpperCase(),
  amount: z.string().min(1, { message: 'El total tiene que ser mayor que 0' }),
  sharedWith: z.string().array(),
  currencyId: z
    .string({
      invalid_type_error: 'Seleccione una moneda',
    })
    .cuid(),
  paymentTypeId: z.string({
    invalid_type_error: 'Por favor seleccione una forma de pago',
  }),
  paymentSourceId: z.string({
    invalid_type_error: 'Por favor seleccione un canal de pago',
  }),
})

const CreateExpenseSchema = ExpenseSchema.omit({
  id: true,
})

export const createExpense = async (_prevState: CreateExpenseState, formData: FormData) => {
  try {
    const validatedFields = CreateExpenseSchema.safeParse({
      description: formData.get('description'),
      notes: formData.get('notes'),
      amount: formData.get('amount'),
      sharedWith: formData.getAll('sharedWith'),
      currencyId: formData.get('currencyId'),
      paymentTypeId: formData.get('paymentTypeId'),
      paymentSourceId: formData.get('paymentSourceId'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { description, notes, amount, sharedWith, currencyId, paymentTypeId, paymentSourceId } = validatedFields.data

    const userId = await getAuthUserId()

    await prisma.expense.create({
      data: {
        description,
        notes,
        amount: removeCurrencyMaskFromInput(amount),
        sharedWith: {
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
        currencyId,
        paymentTypeId,
        paymentSourceId,
        userId,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
  redirect(PAGES_URL.EXPENSES.BASE_PATH)
}

export async function fetchExpenses() {
  noStore()
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
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

export async function fetchExpensePaymentSummaries() {
  noStore()
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.expensePaymentSummary.groupBy({
      by: 'date',
      where: {
        userId: await getAuthUserId(),
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
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
