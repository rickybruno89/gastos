'use server'
import { CreditCardPaymentSummary, Expense, ExpensePaymentSummary, Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'
import { decryptString, getNextMonthDueDate } from '@/lib/utils'

export const addExpenseToSummary = async (date: string, expense: Expense) => {
  try {
    const userId = await getAuthUserId()
    await prisma.expensePaymentSummary.create({
      data: {
        expenseId: expense.id,
        date,
        dueDate: expense.dueDate,
        amount: expense.amount,
        paid: false,
        paymentChannel: expense.paymentChannel,
        userId,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.DASHBOARD.BASE_PATH)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${date}`)
}

export const generateExpenseSummaryForMonth = async (date: string) => {
  try {
    const userId = await getAuthUserId()

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        deleted: false,
      },
    })

    const mappedExpenses = expenses.map((item) => ({
      ...item,
      dueDate: getNextMonthDueDate(item.dueDate, date),
    }))

    const transactions = mappedExpenses.map((item) =>
      prisma.expense.update({
        data: {
          dueDate: item.dueDate,
        },
        where: {
          id: item.id,
        },
      })
    )

    await Promise.all(transactions)

    await prisma.expensePaymentSummary.createMany({
      data: mappedExpenses.map((expense) => ({
        expenseId: expense.id,
        date,
        dueDate: expense.dueDate,
        amount: expense.amount,
        paid: false,
        paymentChannel: expense.paymentChannel,
        userId,
      })),
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.DASHBOARD.BASE_PATH)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${date}`)
}

export async function fetchCreditCardSummaryById(id: string) {
  noStore()
  type DataWithInclude = Prisma.CreditCardPaymentSummaryGetPayload<{
    include: {
      creditCard: true
      itemHistoryPayment: {
        include: {
          creditCardExpenseItem: true
        }
      }
    }
  }>

  try {
    const data = await prisma.creditCardPaymentSummary.findUnique({
      where: {
        id,
      },
      include: {
        creditCard: true,
        itemHistoryPayment: {
          orderBy: [
            {
              creditCardExpenseItem: {
                recurrent: 'desc',
              },
            },
            {
              creditCardExpenseItem: {
                createdAt: 'asc',
              },
            },
          ],
          include: {
            creditCardExpenseItem: true,
          },
        },
      },
    })
    return {
      ...data,
      itemHistoryPayment: data!.itemHistoryPayment.map((item) => ({
        ...item,
        creditCardExpenseItem: {
          ...item.creditCardExpenseItem,
          description: decryptString(item.creditCardExpenseItem.description),
        },
      })),
    } as DataWithInclude
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

type CreateCreditCardPaymentSummaryState = {
  errors?: {
    creditCardExpenseItems?: string[]
    date?: string[]
    dueDate?: string[]
    taxesAmount?: string[]
    totalAmount?: string[]
  }
  message?: string | null
  success?: boolean
}

const CreditCardPaymentSummarySchema = z.object({
  id: z.string().cuid(),
  creditCardExpenseItems: z
    .object({
      id: z.string().cuid(),
      installmentsAmount: z.number(),
      installmentsPaid: z.number(),
      installmentsQuantity: z.number(),
    })
    .array(),
  date: z.string().min(1, { message: 'Ingrese la fecha del resumen' }),
  dueDate: z.string().min(1, { message: 'Ingrese una fecha de vencimiento' }),
  taxesAmount: z.string().min(1, { message: 'El impuesto y sellado tiene que tener algun valor' }),
  totalAmount: z.string().min(1, { message: 'El total tiene que ser mayor que 0' }),
})

const CreateCreditCardPaymentSummarySchema = CreditCardPaymentSummarySchema.omit({
  id: true,
})

export const createSummaryForCreditCard = async (
  creditCardId: string,
  _prevState: CreateCreditCardPaymentSummaryState,
  formData: FormData
) => {
  try {
    const creditCardExpenseItemsForm = formData.get('creditCardExpenseItems') as string
    const creditCardExpenseItemsParsed = JSON.parse(creditCardExpenseItemsForm)
    const validatedFields = CreateCreditCardPaymentSummarySchema.safeParse({
      creditCardExpenseItems: creditCardExpenseItemsParsed,
      date: formData.get('date'),
      dueDate: formData.get('dueDate'),
      taxesAmount: formData.get('taxesAmount'),
      totalAmount: formData.get('totalAmount'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
        success: false,
      }
    }

    const userId = await getAuthUserId()

    const { creditCardExpenseItems, date, taxesAmount, totalAmount, dueDate } = validatedFields.data

    const existingSummaryForCreditCard = await prisma.creditCardPaymentSummary.findFirst({
      where: {
        date,
        creditCardId,
      },
    })

    if (existingSummaryForCreditCard) {
      return {
        errors: {
          date: ['Ya existe un resumen para la fecha'],
        },
        message: 'Error',
        success: false,
      }
    }

    await prisma.creditCardPaymentSummary.create({
      data: {
        amount: parseFloat(totalAmount),
        taxes: parseFloat(taxesAmount),
        date,
        dueDate,
        paid: false,
        creditCardId,
        userId,
        itemHistoryPayment: {
          createMany: {
            data: creditCardExpenseItems.map((item) => ({
              creditCardExpenseItemId: item.id,
              installmentsPaid: item.installmentsPaid + 1,
              installmentsAmount: item.installmentsAmount,
              installmentsQuantity: item.installmentsQuantity,
            })),
          },
        },
      },
    })

    const promises = creditCardExpenseItems.map((item) =>
      prisma.creditCardExpenseItem.update({
        data: {
          installmentsAmount: item.installmentsAmount,
        },
        where: {
          id: item.id,
        },
      })
    )

    await Promise.all(promises)
    revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId))
    revalidatePath(PAGES_URL.DASHBOARD.BASE_PATH)
    return {
      message: 'Resumen creado',
      success: true,
    }
  } catch (error) {
    return {
      message: 'Error en base de datos',
      success: false,
    }
  }
}

export async function fetchCreditCardSummariesForMonth(date: string) {
  noStore()
  const userId = await getAuthUserId()

  type DataWithInclude = Prisma.CreditCardPaymentSummaryGetPayload<{
    include: {
      creditCard: true
      itemHistoryPayment: {
        include: {
          creditCardExpenseItem: {
            include: {
              sharedWith: true
            }
          }
        }
      }
    }
  }>

  try {
    const data = await prisma.creditCardPaymentSummary.findMany({
      orderBy: [
        { paid: 'asc' },
        {
          dueDate: 'asc',
        },
        {
          creditCard: {
            name: 'asc',
          },
        },
      ],
      where: {
        userId,
        date,
      },
      include: {
        creditCard: true,
        itemHistoryPayment: {
          include: {
            creditCardExpenseItem: {
              include: {
                sharedWith: true,
              },
            },
          },
        },
      },
    })
    return data.map((summary) => ({
      ...summary,
      itemHistoryPayment: summary.itemHistoryPayment.map((item) => ({
        ...item,
        creditCardExpenseItem: {
          ...item.creditCardExpenseItem,
          description: decryptString(item.creditCardExpenseItem.description),
        },
      })),
    })) as DataWithInclude[]
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
}

export async function fetchExpenseSummariesForMonth(date: string) {
  noStore()
  const userId = await getAuthUserId()

  type DataWithInclude = Prisma.ExpensePaymentSummaryGetPayload<{
    include: {
      expense: {
        include: {
          sharedWith: true
        }
      }
    }
  }>

  try {
    const data = await prisma.expensePaymentSummary.findMany({
      where: {
        userId,
        date,
      },
      include: {
        expense: {
          include: {
            sharedWith: true,
          },
        },
      },
      orderBy: [
        { paid: 'asc' },

        {
          amount: 'desc',
        },
        {
          dueDate: 'asc',
        },
        {
          expense: {
            createdAt: 'asc',
          },
        },
      ],
    })
    return data.map((item) => ({
      ...item,
      expense: {
        ...item.expense,
        description: decryptString(item.expense.description),
      },
    })) as DataWithInclude[]
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar gastos')
  }
}

export const undoExpensePaymentSummaryPaid = async (expenseItem: ExpensePaymentSummary) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: {
        id: expenseItem.expenseId,
      },
    })
    await prisma.expensePaymentSummary.update({
      data: {
        paid: false,
        amount: expense?.amount,
      },
      where: {
        id: expenseItem.id,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
  revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${expenseItem.date}`)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${expenseItem.date}`)
}

export const setExpensePaymentSummaryPaid = async (expenseItem: ExpensePaymentSummary) => {
  try {
    await prisma.expense.update({
      data: {
        amount: expenseItem.amount,
        paymentChannel: expenseItem.paymentChannel,
      },
      where: {
        id: expenseItem.expenseId,
      },
    })
    await prisma.expensePaymentSummary.update({
      data: {
        amount: expenseItem.amount,
        paid: true,
        paymentChannel: expenseItem.paymentChannel,
      },
      where: {
        id: expenseItem.id,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
  revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${expenseItem.date}`)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${expenseItem.date}`)
}

export const setNoNeedExpensePaymentSummary = async (expenseItem: ExpensePaymentSummary) => {
  try {
    await prisma.expensePaymentSummary.update({
      data: {
        amount: 0,
        paid: true,
      },
      where: {
        id: expenseItem.id,
      },
    })
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
  revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${expenseItem.date}`)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${expenseItem.date}`)
}

export const setCreditCardPaymentSummaryPaid = async (creditCardExpense: CreditCardPaymentSummary) => {
  const creditCardPaymentSummaryExpenseItems = await prisma.creditCardSummaryExpenseItem.findMany({
    where: {
      creditCardPaymentSummaryId: creditCardExpense.id,
    },
  })

  try {
    await prisma.$transaction([
      prisma.creditCardPaymentSummary.update({
        data: {
          paid: true,
          amount: creditCardExpense.amount,
        },
        where: {
          id: creditCardExpense.id,
        },
      }),
      prisma.creditCardExpenseItem.updateMany({
        data: {
          installmentsPaid: {
            increment: 1,
          },
        },
        where: {
          recurrent: false,
          id: {
            in: creditCardPaymentSummaryExpenseItems.map((item) => item.creditCardExpenseItemId),
          },
        },
      }),
      prisma.creditCardExpenseItem.updateMany({
        data: {
          finished: true,
          finishedAt: new Date(),
        },
        where: {
          id: {
            in: creditCardPaymentSummaryExpenseItems.map((item) => item.creditCardExpenseItemId),
          },
          recurrent: false,
          installmentsPaid: {
            equals: prisma.creditCardExpenseItem.fields.installmentsQuantity,
          },
        },
      }),
    ])
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Tarjetas de créditos')
  }
  revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${creditCardExpense.date}`)
  redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${creditCardExpense.date}`)
}

export const deleteCreditCardPaymentSummary = async (id: string) => {
  const creditCardPaymentSummary = await prisma.creditCardPaymentSummary.findUnique({
    where: {
      id,
    },
    include: {
      itemHistoryPayment: true,
    },
  })

  const prismaTransactions = []

  if (creditCardPaymentSummary?.paid)
    prismaTransactions.push(
      prisma.creditCardExpenseItem.updateMany({
        data: {
          installmentsPaid: {
            decrement: 1,
          },
          finished: false,
          finishedAt: null,
        },
        where: {
          id: {
            in: creditCardPaymentSummary.itemHistoryPayment.map((item) => item.creditCardExpenseItemId),
          },
          recurrent: false,
        },
      })
    )

  prismaTransactions.push(
    prisma.creditCardSummaryExpenseItem.deleteMany({
      where: {
        creditCardPaymentSummaryId: id,
      },
    }),
    prisma.creditCardPaymentSummary.delete({
      where: {
        id,
      },
    })
  )

  try {
    await prisma.$transaction(prismaTransactions)
    revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${creditCardPaymentSummary!.date}`)
    revalidatePath(`${PAGES_URL.CREDIT_CARDS.DETAILS(creditCardPaymentSummary!.creditCardId)}`)
    return {
      message: 'Resumen eliminado',
      success: true,
    }
  } catch (error) {
    return {
      message: 'Error en base de datos',
      success: false,
    }
  }
}
