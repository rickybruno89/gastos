'use server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { decryptString, encryptString, removeCurrencyMaskFromInput } from '@/lib/utils'
import { Expense, Prisma } from '@prisma/client'

type CreateExpenseState = {
  errors?: {
    description?: string[]
    notes?: string[]
    dueDate?: string[]
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
  dueDate: z.string(),
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
      dueDate: formData.get('dueDate'),
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

    const { description, notes, dueDate, amount, sharedWith, paymentTypeId, paymentSourceId } = validatedFields.data

    const userId = await getAuthUserId()

    await prisma.expense.create({
      data: {
        description: encryptString(description),
        notes,
        dueDate,
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

export const updateExpense = async (
  id: string,
  callbackUrl: string,
  _prevState: CreateExpenseState,
  formData: FormData
) => {
  try {
    const validatedFields = CreateExpenseSchema.safeParse({
      description: formData.get('description'),
      dueDate: formData.get('dueDate'),
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

    const { description, notes, dueDate, amount, sharedWith, paymentTypeId, paymentSourceId } = validatedFields.data

    await prisma.expense.update({
      data: {
        description: encryptString(description),
        dueDate,
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

    const expensePaymentSummaryToUpdate = await prisma.expensePaymentSummary.findFirst({
      where: {
        expenseId: id,
      },
      orderBy: {
        date: 'desc',
      },
    })
    if (expensePaymentSummaryToUpdate && !expensePaymentSummaryToUpdate.paid) {
      await prisma.expensePaymentSummary.update({
        data: {
          dueDate,
        },
        where: {
          id: expensePaymentSummaryToUpdate.id,
        },
      })
    }
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
  revalidatePath(callbackUrl)
  redirect(callbackUrl)
}

export async function fetchExpenseItem(id: string) {
  noStore()

  type DataWithInclude = Prisma.ExpenseGetPayload<{
    include: {
      paymentSource: true
      paymentType: true
      sharedWith: true
    }
  }>

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
    return { ...data, description: decryptString(data.description) } as DataWithInclude
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar gasto')
  }
}

export async function fetchExpenses() {
  noStore()
  type DataWithInclude = Prisma.ExpenseGetPayload<{
    include: {
      paymentSource: true
      paymentType: true
      sharedWith: true
    }
  }>

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
    return data.map((expense) => ({
      ...expense,
      description: decryptString(expense.description),
    })) as DataWithInclude[]
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
