'use server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { decryptString, encryptString, removeCurrencyMaskFromInput } from '@/lib/utils'
import { Currency, Expense, PaymentChannel, Prisma } from '@prisma/client'

type CreateExpenseState = {
  errors?: {
    description?: string[]
    notes?: string[]
    dueDate?: string[]
    amount?: string[]
    currency?: string[]
    sharedWith?: string[]
    paymentChannel?: string[]
    isAnnualPayment?: string[]
    annualPaymentDate?: string[]
  }
  message?: string | null
  success?: boolean
}

const ExpenseSchema = z.object({
  id: z.string().cuid(),
  description: z.string().toUpperCase().min(1, { message: 'Ingrese una descripción' }),
  dueDate: z.string(),
  notes: z.string().toUpperCase(),
  amount: z.string().min(1, { message: 'El total tiene que ser mayor que 0' }),
  currency: z.enum(['ARS', 'USD']),
  sharedWith: z.string().array(),
  paymentChannel: z.string(),
  isAnnualPayment: z.boolean().optional(),
  annualPaymentDate: z.string().optional(),
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
      currency: formData.get('currency') || 'ARS',
      sharedWith: formData.getAll('sharedWith'),
      paymentChannel: formData.get('paymentChannel'),
      isAnnualPayment: formData.get('isAnnualPayment') === 'true',
      annualPaymentDate: formData.get('annualPaymentDate'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
        success: false,
      }
    }

    const {
      description,
      notes,
      dueDate,
      amount,
      currency,
      sharedWith,
      paymentChannel,
      isAnnualPayment,
      annualPaymentDate,
    } = validatedFields.data

    const userId = await getAuthUserId()

    await prisma.expense.create({
      data: {
        description: encryptString(description),
        notes,
        dueDate: dueDate || null,
        amount: removeCurrencyMaskFromInput(amount),
        currency: currency as Currency,
        sharedWith: {
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
        paymentChannel: paymentChannel as PaymentChannel,
        isAnnualPayment: isAnnualPayment || false,
        annualPaymentDate: annualPaymentDate || null,
        userId,
      },
    })
    revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
    return {
      success: true,
      message: 'Gasto creado',
    }
  } catch (error) {
    return {
      message: 'Error en base de datos',
      success: false,
    }
  }
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
      currency: formData.get('currency') || 'ARS',
      sharedWith: formData.getAll('sharedWith'),
      paymentChannel: formData.get('paymentChannel'),
      isAnnualPayment: formData.get('isAnnualPayment') === 'true',
      annualPaymentDate: formData.get('annualPaymentDate') || undefined,
    })

    if (!validatedFields.success) {
      console.log("🚀 ~ updateExpense ~ validation errors:", validatedFields.error.flatten().fieldErrors)
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error de validación',
        success: false,
      }
    }

    const {
      description,
      notes,
      dueDate,
      amount,
      currency,
      sharedWith,
      paymentChannel,
      isAnnualPayment,
      annualPaymentDate,
    } = validatedFields.data

    await prisma.expense.update({
      data: {
        description: encryptString(description),
        dueDate: dueDate || null,
        notes,
        amount: removeCurrencyMaskFromInput(amount),
        currency: currency as Currency,
        sharedWith: {
          set: [],
          connect: sharedWith.map((personId) => ({ id: personId })),
        },
        paymentChannel: paymentChannel as PaymentChannel,
        isAnnualPayment: isAnnualPayment || false,
        annualPaymentDate: annualPaymentDate ? (annualPaymentDate as string) : null,
      },
      where: {
        id,
      },
    })

    // Actualizar todos los ExpensePaymentSummary no pagados
    const isPaidAnnually = isAnnualPayment && annualPaymentDate !== null && annualPaymentDate !== undefined

    await prisma.expensePaymentSummary.updateMany({
      where: {
        expenseId: id,
        paid: false,
      },
      data: {
        dueDate: dueDate || null,
        amount: removeCurrencyMaskFromInput(amount),
        currency: currency as Currency,
        paymentChannel: paymentChannel as PaymentChannel,
        paid: isPaidAnnually,
      },
    })
    revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
    revalidatePath(callbackUrl)
    return {
      message: 'Gasto actualizado',
      success: true,
    }
  } catch (error) {
    console.log("🚀 ~ updateExpense ~ error:", error)
    return {
      message: 'Error en base de datos',
      success: false,
    }
  }
}

export async function fetchExpenseItem(id: string) {
  noStore()

  type DataWithInclude = Prisma.ExpenseGetPayload<{
    include: {
      sharedWith: true
    }
  }>

  try {
    const data = (await prisma.expense.findUnique({
      where: {
        id,
      },
      include: {
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
        sharedWith: true,
      },
      orderBy: {
        createdAt: 'asc',
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

export const updateExpenseAmount = async (expensePaymentSummaryId: string, newAmount: number) => {
  'use server'
  try {
    const expensePaymentSummary = await prisma.expensePaymentSummary.findUnique({
      where: {
        id: expensePaymentSummaryId,
      },
    })

    if (!expensePaymentSummary) {
      return {
        message: 'Resumen de gasto no encontrado',
        success: false,
      }
    }

    // Actualizar el monto en el resumen de pago
    await prisma.expensePaymentSummary.update({
      where: {
        id: expensePaymentSummaryId,
      },
      data: {
        amount: newAmount,
      },
    })

    revalidatePath(PAGES_URL.DASHBOARD.BASE_PATH)
    return {
      message: 'Monto actualizado',
      success: true,
    }
  } catch (error) {
    return {
      message: 'Error en base de datos',
      success: false,
    }
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
      success: false,
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
    revalidatePath(PAGES_URL.EXPENSES.BASE_PATH)
    return {
      message: 'Gasto eliminado',
      success: true,
    }
  } catch (error) {
    return {
      message: 'Error en base de datos',
      success: false,
    }
  }
}
