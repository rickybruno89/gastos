'use server'
import { PaymentType } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { removeCurrencyMaskFromInput } from '@/lib/utils'

type CreateCreditCardState = {
  errors?: {
    creditCardName?: string[]
    taxesPercent?: string[]
    paymentTypeId?: string[]
    paymentSourceId?: string[]
  }
  message?: string | null
}

type CreateCreditCardExpenseItemState = {
  errors?: {
    description?: string[]
    notes?: string[]
    amount?: string[]
    sharedWith?: string[]
    recurrent?: string[]
    installmentsQuantity?: string[]
    installmentsPaid?: string[]
    installmentsAmount?: string[]
    paymentBeginning?: string[]
    currencyId?: string[]
    creditCardId?: string[]
  }
  message?: string | null
}

const CreditCardExpenseItemSchema = z.object({
  id: z.string().cuid(),
  description: z.string().toUpperCase().min(1, { message: 'Ingrese una descripción' }),
  notes: z.string().toUpperCase(),
  amount: z.string().min(1, { message: 'El total tiene que ser mayor que 0' }),
  sharedWith: z.string().array(),
  recurrent: z.boolean(),
  installmentsQuantity: z.coerce.number(),
  installmentsPaid: z.coerce.number(),
  paymentBeginning: z.string().min(1, { message: 'Ingrese una fecha' }),
  currencyId: z
    .string({
      invalid_type_error: 'Seleccione una moneda',
    })
    .cuid(),
})

const CreateCreditCardExpenseItemSchema = CreditCardExpenseItemSchema.omit({
  id: true,
})

const CreditCardSchema = z.object({
  id: z.string().cuid(),
  creditCardName: z.string().min(1, { message: 'El nombre es requerido' }).toUpperCase(),
  taxesPercent: z.coerce.number().gt(0, { message: 'El porcentaje tiene que ser mayor que 0' }),
  paymentTypeId: z.string({
    invalid_type_error: 'Por favor seleccione una forma de pago',
  }),
  paymentSourceId: z.string({
    invalid_type_error: 'Por favor seleccione un canal de pago',
  }),
})

const CreateCreditCardSchema = CreditCardSchema.omit({ id: true })

export const createCreditCard = async (
  _prevState: CreateCreditCardState,
  formData: FormData
): Promise<PaymentType | any> => {
  try {
    const validatedFields = CreateCreditCardSchema.safeParse({
      creditCardName: formData.get('creditCardName'),
      taxesPercent: formData.get('taxesPercent'),
      paymentTypeId: formData.get('paymentTypeId'),
      paymentSourceId: formData.get('paymentSourceId'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { creditCardName, taxesPercent, paymentTypeId, paymentSourceId } = validatedFields.data

    const userId = await getAuthUserId()

    const existingCreditCard = await prisma.creditCard.findFirst({
      where: {
        name: creditCardName,
        userId,
      },
    })

    if (existingCreditCard) {
      return {
        errors: { creditCardName: ['La Tarjeta de crédito ya existe'] },
        message: 'Error',
      }
    }

    await prisma.creditCard.create({
      data: {
        name: creditCardName,
        taxesPercent: taxesPercent,
        paymentTypeId: paymentTypeId,
        paymentSourceId: paymentSourceId,
        userId,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.BASE_PATH)
  redirect(PAGES_URL.CREDIT_CARDS.BASE_PATH)
}

export const createCreditCardExpenseItem = async (
  creditCardId: string,
  _prevState: CreateCreditCardExpenseItemState,
  formData: FormData
) => {
  try {
    const validatedFields = CreateCreditCardExpenseItemSchema.safeParse({
      description: formData.get('description'),
      notes: formData.get('notes'),
      amount: formData.get('amount'),
      sharedWith: formData.getAll('sharedWith'),
      recurrent: formData.get('recurrent') === 'true',
      installmentsQuantity: formData.get('installmentsQuantity'),
      installmentsPaid: formData.get('installmentsPaid'),
      paymentBeginning: formData.get('paymentBeginning'),
      currencyId: formData.get('currencyId'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const {
      description,
      notes,
      amount,
      sharedWith,
      recurrent,
      installmentsQuantity,
      installmentsPaid,
      paymentBeginning,
      currencyId,
    } = validatedFields.data

    const userId = await getAuthUserId()

    const existingCreditCard = await prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId,
      },
    })

    if (!existingCreditCard) {
      return {
        errors: { description: ['La tarjeta no existe'] },
        message: 'Error',
      }
    }

    await prisma.creditCardExpenseItem.create({
      data: {
        description,
        notes,
        amount: recurrent ? 0 : removeCurrencyMaskFromInput(amount),
        sharedWith: {
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
        recurrent,
        installmentsQuantity,
        installmentsPaid,
        installmentsAmount: recurrent
          ? removeCurrencyMaskFromInput(amount)
          : removeCurrencyMaskFromInput(amount) / installmentsQuantity,
        paymentBeginning,
        currencyId,
        creditCardId,
        userId,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId))
  redirect(PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId))
}

export const updateCreditCardExpenseItem = async (
  id: string,
  _prevState: CreateCreditCardExpenseItemState,
  formData: FormData
) => {
  const existingCreditCardExpenseItem = await prisma.creditCardExpenseItem.findUnique({
    where: {
      id,
    },
  })

  if (!existingCreditCardExpenseItem) {
    return {
      errors: { description: ['El Item no existe'] },
      message: 'Error',
    }
  }
  try {
    const validatedFields = CreateCreditCardExpenseItemSchema.safeParse({
      description: formData.get('description'),
      notes: formData.get('notes'),
      amount: formData.get('amount'),
      sharedWith: formData.getAll('sharedWith'),
      recurrent: formData.get('recurrent') === 'true',
      installmentsQuantity: formData.get('installmentsQuantity'),
      installmentsPaid: formData.get('installmentsPaid'),
      paymentBeginning: formData.get('paymentBeginning'),
      currencyId: formData.get('currencyId'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const {
      description,
      notes,
      amount,
      sharedWith,
      recurrent,
      installmentsQuantity,
      installmentsPaid,
      paymentBeginning,
      currencyId,
    } = validatedFields.data

    await prisma.creditCardExpenseItem.update({
      data: {
        description,
        notes,
        amount: recurrent ? 0 : removeCurrencyMaskFromInput(amount),
        sharedWith: {
          set: [],
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
        recurrent,
        installmentsQuantity,
        installmentsPaid,
        installmentsAmount: recurrent
          ? removeCurrencyMaskFromInput(amount)
          : removeCurrencyMaskFromInput(amount) / installmentsQuantity,
        paymentBeginning,
        currencyId,
      },
      where: {
        id,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(existingCreditCardExpenseItem.creditCardId))
  redirect(PAGES_URL.CREDIT_CARDS.DETAILS(existingCreditCardExpenseItem.creditCardId))
}

export async function fetchCreditCards() {
  noStore()
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCard.findMany({
      where: {
        userId: await getAuthUserId(),
      },
      include: {
        creditCardExpenseItems: {
          where: {
            finished: false,
            deleted: false,
          },
        },
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

export async function fetchCreditCardById(id: string) {
  noStore()
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCard.findUnique({
      where: {
        userId: await getAuthUserId(),
        id,
      },
      include: {
        paymentSource: true,
        paymentType: true,
        paymentSummaries: {
          orderBy: {
            date: 'desc',
          },
        },
        creditCardExpenseItems: {
          where: {
            finished: false,
            deleted: false,
          },
          orderBy: [
            {
              paymentBeginning: 'asc',
            },
          ],
          include: {
            sharedWith: true,
          },
        },
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

export async function fetchCreditCardName(id: string) {
  noStore()
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCard.findFirst({
      where: {
        userId: await getAuthUserId(),
        id,
      },
      select: {
        name: true,
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

export async function fetchCreditCardExpenseItem(id: string) {
  noStore()
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.creditCardExpenseItem.findUnique({
      where: {
        id,
      },
      include: {
        sharedWith: true,
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

export const deleteCreditCardExpenseItem = async (id: string) => {
  const existingCreditCardExpenseItem = await prisma.creditCardExpenseItem.findUnique({
    where: {
      id,
    },
  })

  if (!existingCreditCardExpenseItem) {
    return {
      errors: { description: ['El Item no existe'] },
      message: 'Error',
    }
  }
  try {
    await prisma.creditCardExpenseItem.update({
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
      where: {
        id,
      },
    })
  } catch (error) {
    console.log('🚀 ~ file: credit-card.ts:416 ~ deleteCreditCardExpenseItem ~ error:', error)
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(existingCreditCardExpenseItem.creditCardId))
  redirect(PAGES_URL.CREDIT_CARDS.DETAILS(existingCreditCardExpenseItem.creditCardId))
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
