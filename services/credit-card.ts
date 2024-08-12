'use server'
import { CreditCardPaymentSummary, Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { decryptString, encryptString, removeCurrencyMaskFromInput } from '@/lib/utils'

type CreateCreditCardState = {
  errors?: {
    creditCardName?: string[]
    taxesPercent?: string[]
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
})

const CreateCreditCardExpenseItemSchema = CreditCardExpenseItemSchema.omit({
  id: true,
})

const CreditCardSchema = z.object({
  id: z.string().cuid(),
  creditCardName: z.string().min(1, { message: 'El nombre es requerido' }).toUpperCase(),
  color: z.string(),
  textColor: z.string(),
  taxesPercent: z.coerce.number().gt(0, { message: 'El porcentaje tiene que ser mayor que 0' }),
})

const CreateCreditCardSchema = CreditCardSchema.omit({ id: true })

export const updateCreditCard = async (id: string, _prevState: CreateCreditCardState, formData: FormData) => {
  try {
    const validatedFields = CreateCreditCardSchema.safeParse({
      creditCardName: formData.get('creditCardName'),
      color: formData.get('color'),
      textColor: formData.get('textColor'),
      taxesPercent: formData.get('taxesPercent'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { creditCardName, color, textColor, taxesPercent } = validatedFields.data

    const userId = await getAuthUserId()

    const existingCreditCard = await prisma.creditCard.findFirst({
      where: {
        name: creditCardName,
        userId,
        id: {
          not: id,
        },
      },
    })

    if (existingCreditCard) {
      return {
        errors: { creditCardName: ['El nombre ya existe'] },
        message: 'Error',
      }
    }

    await prisma.creditCard.update({
      data: {
        name: creditCardName,
        color,
        textColor,
        taxesPercent,
        userId,
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
  revalidatePath(PAGES_URL.CREDIT_CARDS.BASE_PATH)
  redirect(PAGES_URL.CREDIT_CARDS.BASE_PATH)
}

export const createCreditCard = async (_prevState: CreateCreditCardState, formData: FormData) => {
  try {
    const validatedFields = CreateCreditCardSchema.safeParse({
      creditCardName: formData.get('creditCardName'),
      color: formData.get('color'),
      textColor: formData.get('textColor'),
      taxesPercent: formData.get('taxesPercent'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { creditCardName, color, textColor, taxesPercent } = validatedFields.data

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
        color,
        textColor,
        taxesPercent,
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
        description: encryptString(description),
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
    } = validatedFields.data

    await prisma.creditCardExpenseItem.update({
      data: {
        description: encryptString(description),
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
      orderBy: {
        createdAt: 'asc',
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

  type DataWithInclude = Prisma.CreditCardGetPayload<{
    include: {
      paymentSummaries: true
      creditCardExpenseItems: {
        include: {
          sharedWith: true
        }
      }
    }
  }>

  try {
    const data = await prisma.creditCard.findUnique({
      where: {
        userId: await getAuthUserId(),
        id,
      },
      include: {
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
              recurrent: 'desc',
            },
            {
              createdAt: 'asc',
            },
          ],
          include: {
            sharedWith: true,
          },
        },
      },
    })
    return {
      ...data,
      creditCardExpenseItems: data!.creditCardExpenseItems.map((item) => ({
        ...item,
        description: decryptString(item.description),
      })),
    } as DataWithInclude
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
  type DataWithInclude = Prisma.CreditCardExpenseItemGetPayload<{
    include: {
      sharedWith: true
    }
  }>

  try {
    const data = await prisma.creditCardExpenseItem.findUnique({
      where: {
        id,
      },
      include: {
        sharedWith: true,
      },
    })
    return {
      ...data,
      description: decryptString(data!.description),
    } as DataWithInclude
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
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(existingCreditCardExpenseItem.creditCardId))
  redirect(PAGES_URL.CREDIT_CARDS.DETAILS(existingCreditCardExpenseItem.creditCardId))
}

export const undoCCExpensePaymentSummaryPaid = async (item: CreditCardPaymentSummary) => {
  try {
    await prisma.creditCardPaymentSummary.update({
      data: {
        paid: false,
      },
      where: {
        id: item.id,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
  revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${item.date}`)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${item.date}`)
}
