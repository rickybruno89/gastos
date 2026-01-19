'use server'
import { CreditCardPaymentSummary, Currency, Expense, ExpensePaymentSummary, Prisma } from '@prisma/client'
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

    // Verificar si es pago anual
    const isPaidAnnually = expense.isAnnualPayment && expense.annualPaymentDate !== null

    await prisma.expensePaymentSummary.create({
      data: {
        expenseId: expense.id,
        date,
        dueDate: expense.dueDate,
        amount: expense.amount,
        currency: expense.currency,
        paid: isPaidAnnually,
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

    const currentYear = parseInt(date.substring(0, 4)) // 2026
    const currentMonthNum = parseInt(date.substring(5, 7)) // 01

    const mappedExpenses = expenses.map((item) => {
      let isPaidAnnually = false
      let amount = item.amount
      let shouldResetAnnualPayment = false

      if (item.isAnnualPayment && item.annualPaymentDate) {
        const annualPaymentYear = parseInt(item.annualPaymentDate.substring(0, 4))
        const annualPaymentMonth = parseInt(item.annualPaymentDate.substring(5, 7))

        // Si estamos en enero y el pago anual fue el año pasado, resetear
        if (currentMonthNum === 1 && annualPaymentYear < currentYear) {
          shouldResetAnnualPayment = true
          isPaidAnnually = false
          amount = item.amount
        }
        // Si el pago anual es del año actual
        else if (annualPaymentYear === currentYear) {
          // Si estamos en el mes del pago o después (pero en el mismo año)
          if (currentMonthNum >= annualPaymentMonth) {
            isPaidAnnually = true
            // Si es el mes del pago, monto real. Si es después, monto 0
            amount = currentMonthNum === annualPaymentMonth ? item.amount : 0
          }
        }
        // Si el pago anual es del año pasado y no estamos en enero
        else if (annualPaymentYear < currentYear) {
          shouldResetAnnualPayment = true
          isPaidAnnually = false
          amount = item.amount
        }
      }

      return {
        ...item,
        dueDate: getNextMonthDueDate(item.dueDate, date),
        paid: isPaidAnnually,
        amount,
        shouldResetAnnualPayment,
      }
    })

    // Actualizar expenses que necesitan resetear el pago anual
    const resetTransactions = mappedExpenses
      .filter((item) => item.shouldResetAnnualPayment)
      .map((item) =>
        prisma.expense.update({
          data: {
            dueDate: item.dueDate,
            isAnnualPayment: false,
            annualPaymentDate: null,
          },
          where: {
            id: item.id,
          },
        })
      )

    // Actualizar expenses que NO necesitan resetear
    const updateTransactions = mappedExpenses
      .filter((item) => !item.shouldResetAnnualPayment)
      .map((item) =>
        prisma.expense.update({
          data: {
            dueDate: item.dueDate,
          },
          where: {
            id: item.id,
          },
        })
      )

    await Promise.all([...resetTransactions, ...updateTransactions])

    await prisma.expensePaymentSummary.createMany({
      data: mappedExpenses.map((expense) => ({
        expenseId: expense.id,
        date,
        dueDate: expense.dueDate,
        amount: expense.amount,
        currency: expense.currency,
        paid: expense.paid,
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
  taxesAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  taxesAmountARS: z.string().optional(),
  taxesAmountUSD: z.string().optional(),
  totalAmountARS: z.string().optional(),
  totalAmountUSD: z.string().optional(),
  creditBalanceARS: z.string().optional(),
  creditBalanceUSD: z.string().optional(),
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
      taxesAmountARS: formData.get('taxesAmountARS'),
      taxesAmountUSD: formData.get('taxesAmountUSD'),
      totalAmountARS: formData.get('totalAmountARS'),
      totalAmountUSD: formData.get('totalAmountUSD'),
      creditBalanceARS: formData.get('creditBalanceARS'),
      creditBalanceUSD: formData.get('creditBalanceUSD'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
        success: false,
      }
    }

    const userId = await getAuthUserId()

    const {
      creditCardExpenseItems,
      date,
      taxesAmount,
      totalAmount,
      dueDate,
      taxesAmountARS,
      taxesAmountUSD,
      totalAmountARS,
      totalAmountUSD,
      creditBalanceARS,
      creditBalanceUSD,
    } = validatedFields.data

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

    // Calcular summarySequence
    const lastSummary = await prisma.creditCardPaymentSummary.findFirst({
      where: { creditCardId },
      orderBy: { summarySequence: 'desc' },
    })
    const summarySequence = (lastSummary?.summarySequence || 0) + 1

    // Crear el resumen
    const createdSummary = await prisma.creditCardPaymentSummary.create({
      data: {
        amount: totalAmount ? parseFloat(totalAmount) : 0,
        taxes: taxesAmount ? parseFloat(taxesAmount) : 0,
        taxesARS: taxesAmountARS ? parseFloat(taxesAmountARS) : 0,
        taxesUSD: taxesAmountUSD ? parseFloat(taxesAmountUSD) : 0,
        totalAmountARS: totalAmountARS ? parseFloat(totalAmountARS) : null,
        totalAmountUSD: totalAmountUSD ? parseFloat(totalAmountUSD) : null,
        creditBalanceARS: creditBalanceARS ? parseFloat(creditBalanceARS) : 0,
        creditBalanceUSD: creditBalanceUSD ? parseFloat(creditBalanceUSD) : 0,
        summarySequence,
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

    // Obtener los items completos con sus installmentPayments
    const items = await prisma.creditCardExpenseItem.findMany({
      where: {
        id: { in: creditCardExpenseItems.map((i) => i.id) },
      },
      include: {
        installmentPayments: {
          where: { isPaid: false },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    })

    // Asociar el primer installment no pagado de cada item al resumen
    for (const item of items) {
      const nextUnpaidInstallment = item.installmentPayments[0]
      if (nextUnpaidInstallment) {
        await prisma.installmentPayment.update({
          where: { id: nextUnpaidInstallment.id },
          data: {
            creditCardPaymentSummaryId: createdSummary.id,
          },
        })
      }
    }

    revalidatePath(PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId))
    revalidatePath(PAGES_URL.DASHBOARD.BASE_PATH)
    return {
      message: 'Resumen creado',
      success: true,
    }
  } catch (error) {
    console.error('Error creating summary:', error)
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
  // Validación de idempotencia
  if (creditCardExpense.paid) {
    revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${creditCardExpense.date}`)
    redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${creditCardExpense.date}`)
  }

  const creditCardPaymentSummaryExpenseItems = await prisma.creditCardSummaryExpenseItem.findMany({
    where: {
      creditCardPaymentSummaryId: creditCardExpense.id,
    },
  })

  try {
    await prisma.$transaction([
      // Marcar resumen como pagado
      prisma.creditCardPaymentSummary.update({
        data: {
          paid: true,
          amount: creditCardExpense.amount,
        },
        where: {
          id: creditCardExpense.id,
        },
      }),
      // Marcar InstallmentPayments como pagados
      prisma.installmentPayment.updateMany({
        where: {
          creditCardPaymentSummaryId: creditCardExpense.id,
        },
        data: {
          isPaid: true,
          paymentDate: creditCardExpense.date,
        },
      }),
      // Incrementar installmentsPaid (mantener por compatibilidad)
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
      // Marcar items como finished si todas las cuotas están pagadas
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
      installmentPayments: true,
    },
  })

  if (!creditCardPaymentSummary) {
    return {
      message: 'Resumen no encontrado',
      success: false,
    }
  }

  // Validar que solo se pueda eliminar el último resumen
  const lastSummary = await prisma.creditCardPaymentSummary.findFirst({
    where: {
      creditCardId: creditCardPaymentSummary.creditCardId,
    },
    orderBy: {
      summarySequence: 'desc',
    },
  })

  if (lastSummary && creditCardPaymentSummary.id !== lastSummary.id) {
    return {
      message: 'Solo se puede eliminar el último resumen generado',
      success: false,
    }
  }

  const prismaTransactions = []

  // Si el resumen estaba pagado, desmarcar los installments
  if (creditCardPaymentSummary.paid) {
    prismaTransactions.push(
      // Desmarcar InstallmentPayments como no pagados
      prisma.installmentPayment.updateMany({
        where: {
          creditCardPaymentSummaryId: id,
        },
        data: {
          isPaid: false,
          paymentDate: null,
          creditCardPaymentSummaryId: null,
        },
      }),
      // Decrementar installmentsPaid (mantener por compatibilidad)
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
  } else {
    // Si no estaba pagado, solo desasociar los installments
    prismaTransactions.push(
      prisma.installmentPayment.updateMany({
        where: {
          creditCardPaymentSummaryId: id,
        },
        data: {
          creditCardPaymentSummaryId: null,
        },
      })
    )
  }

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
    revalidatePath(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${creditCardPaymentSummary.date}`)
    revalidatePath(`${PAGES_URL.CREDIT_CARDS.DETAILS(creditCardPaymentSummary.creditCardId)}`)
    return {
      message: 'Resumen eliminado',
      success: true,
    }
  } catch (error) {
    console.error('Error deleting summary:', error)
    return {
      message: 'Error en base de datos',
      success: false,
    }
  }
}
