'use server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { decryptString, encryptString, removeCurrencyMaskFromInput } from '@/lib/utils'
import { Expense } from '@prisma/client'

type CreateExpenseState = {
  errors?: {
    description?: string[]
    notes?: string[]
    amount?: string[]
    sharedWith?: string[]
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
      paymentTypeId: formData.get('paymentTypeId'),
      paymentSourceId: formData.get('paymentSourceId'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { description, notes, amount, sharedWith, paymentTypeId, paymentSourceId } = validatedFields.data

    const userId = await getAuthUserId()

    await prisma.expense.create({
      data: {
        description: encryptString(description),
        notes,
        amount: removeCurrencyMaskFromInput(amount),
        sharedWith: {
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
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

export const updateExpense = async (id: string, _prevState: CreateExpenseState, formData: FormData) => {
  try {
    const validatedFields = CreateExpenseSchema.safeParse({
      description: formData.get('description'),
      notes: formData.get('notes'),
      amount: formData.get('amount'),
      sharedWith: formData.getAll('sharedWith'),
      paymentTypeId: formData.get('paymentTypeId'),
      paymentSourceId: formData.get('paymentSourceId'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { description, notes, amount, sharedWith, paymentTypeId, paymentSourceId } = validatedFields.data

    await prisma.expense.update({
      data: {
        description: encryptString(description),
        notes,
        amount: removeCurrencyMaskFromInput(amount),
        sharedWith: {
          set: [],
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
        paymentTypeId,
        paymentSourceId,
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
  revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
  redirect(PAGES_URL.EXPENSES.BASE_PATH)
}

export async function fetchExpenseItem(id: string) {
  noStore()
  try {
    const data = (await prisma.expense.findUnique({
      where: {
        id,
      },
      include: {
        paymentSource: true,
        paymentType: true,
        sharedWith: true,
      },
    })) as Expense
    return { ...data, description: decryptString(data.description) }
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar gasto')
  }
}

export async function fetchExpenses() {
  noStore()
  try {
    const data = await prisma.expense.findMany({
      where: {
        userId: await getAuthUserId(),
        deleted: false,
      },
      include: {
        paymentSource: true,
        paymentType: true,
        sharedWith: true,
      },
    })
    const decryptedData = data.map((expense) => ({
      ...expense,
      description: decryptString(expense.description),
    }))
    return decryptedData
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Gastos')
  }
}

export const deleteExpenseItem = async (id: string) => {
  const existingExpenseItem = await prisma.expense.findUnique({
    where: {
      id,
    },
  })

  if (!existingExpenseItem) {
    return {
      errors: { description: ['El Item no existe'] },
      message: 'Error',
    }
  }
  try {
    await prisma.expense.update({
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
  revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
  redirect(PAGES_URL.EXPENSES.BASE_PATH)
}
