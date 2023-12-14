import { mailer } from '@/lib/mailer'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { decryptString, getDueDatePlusOneDay, getTodayDueDate } from '@/lib/utils'

interface Expense {
  userEmail: string
  expense: string
  dueDate: string | null
}

interface ReducedExpense {
  userEmail: string
  today: string[]
  tomorrow: string[]
  unknownDueDate?: string[]
}
interface GroupedByUser {
  userEmail: string
  expenses: { today: string[]; tomorrow: string[]; unknownDueDate: string[] } | null
  creditCardExpenses: { today: string[]; tomorrow: string[] } | null
}

const getExpensesToExpire = async () => {
  const today = getTodayDueDate()
  const tomorrow = getDueDatePlusOneDay()
  const expenses = await prisma.expensePaymentSummary.findMany({
    where: {
      OR: [
        {
          dueDate: {
            in: [today, tomorrow, ''],
          },
        },
        {
          dueDate: null,
        },
      ],
      paid: false,
    },
    select: {
      dueDate: true,
      user: {
        select: {
          email: true,
        },
      },
      expense: {
        select: {
          description: true,
        },
      },
    },
  })

  const mappedExpenses = expenses.map((item) => ({
    userEmail: item.user.email,
    expense: decryptString(item.expense.description),
    dueDate: item.dueDate,
  })) as Expense[]

  const reducedExpenses: ReducedExpense[] = mappedExpenses.reduce<ReducedExpense[]>((acc, expense) => {
    const targetEntry = acc.find((entry) => entry.userEmail === expense.userEmail)
    if (!targetEntry) {
      acc.push({
        userEmail: expense.userEmail,
        today: [],
        tomorrow: [],
        unknownDueDate: [],
      })
    }

    const entryToUpdate = acc.find((entry) => entry.userEmail === expense.userEmail)!

    const targetArray =
      expense.dueDate === today
        ? entryToUpdate.today
        : expense.dueDate === tomorrow
        ? entryToUpdate.tomorrow
        : entryToUpdate.unknownDueDate!

    targetArray.push(expense.expense)

    return acc
  }, [])

  const creditCardExpenses = await prisma.creditCardPaymentSummary.findMany({
    where: {
      dueDate: {
        in: [today, tomorrow, ''],
      },
      paid: false,
    },
    select: {
      dueDate: true,
      user: {
        select: {
          email: true,
        },
      },
      creditCard: {
        select: {
          name: true,
        },
      },
    },
  })

  const mappedCreditCardExpenses = creditCardExpenses.map((item) => ({
    userEmail: item.user.email,
    expense: item.creditCard.name,
    dueDate: item.dueDate,
  })) as Expense[]

  const reducedCreditCardExpenses: ReducedExpense[] = mappedCreditCardExpenses.reduce<ReducedExpense[]>(
    (acc, expense) => {
      const targetEntry = acc.find((entry) => entry.userEmail === expense.userEmail)
      if (!targetEntry) {
        acc.push({
          userEmail: expense.userEmail,
          today: [],
          tomorrow: [],
        })
      }

      const entryToUpdate = acc.find((entry) => entry.userEmail === expense.userEmail)!

      const targetArray = expense.dueDate === today ? entryToUpdate.today : entryToUpdate.tomorrow

      targetArray.push(expense.expense)

      return acc
    },
    []
  )

  const userEmailsSet = new Set([
    ...reducedExpenses.map((item) => item.userEmail),
    ...reducedCreditCardExpenses.map((item) => item.userEmail),
  ])

  const groupedAllByUser = Array.from(userEmailsSet).map((userEmailItem) => {
    const expenseUser = reducedExpenses.find((item) => item.userEmail === userEmailItem)
    const creditCardUser = reducedCreditCardExpenses.find((item) => item.userEmail === userEmailItem)

    const getExpensesWithoutUser = () => {
      if (!expenseUser) return null
      const { userEmail, ...expensesWithoutUser } = expenseUser
      return expensesWithoutUser
    }

    const getCreditCardExpensesWithoutUser = () => {
      if (!creditCardUser) return null
      const { userEmail, ...expensesWithoutUser } = creditCardUser
      return expensesWithoutUser
    }

    return {
      userEmail: userEmailItem,
      expenses: getExpensesWithoutUser(),
      creditCardExpenses: getCreditCardExpensesWithoutUser(),
    }
  }) as GroupedByUser[]

  return groupedAllByUser
}

const buildHTMLExpensesList = (expenses: string[]) => {
  if (!expenses.length) return '<li>No se encontraron gastos</li>'
  let expensesList = ''
  for (const expense of expenses) {
    expensesList += `<li>${expense}</li>`
  }
  return expensesList
}

const buildHTMLExpenses = (expenses: GroupedByUser['expenses']) => {
  if (!expenses) return '<h3>No hay próximos vencimientos</h3>'
  const expenseToday = buildHTMLExpensesList(expenses.today)
  const expenseTomorrow = buildHTMLExpensesList(expenses.tomorrow)
  const expenseUnknownDate = buildHTMLExpensesList(expenses.unknownDueDate)

  return `
    <ul>
      <li>
        <h3>Vencen Hoy</h3>
        <ul>${expenseToday}</ul>
      </li>
      <li>
        <h3>Vencen Mañana</h3>
        <ul>${expenseTomorrow}</ul>
      </li>
      <li>
        <h3>Gastos no pagados que no tienen fecha de vencimiento</h3>
        <ul>${expenseUnknownDate}</ul>
      </li>
    </ul>
  `
}
const buildHTMLCreditCardExpenses = (expenses: GroupedByUser['creditCardExpenses']) => {
  if (!expenses) return '<h3>No hay próximos vencimientos</h3>'
  const expenseToday = buildHTMLExpensesList(expenses.today)
  const expenseTomorrow = buildHTMLExpensesList(expenses.tomorrow)

  return `
    <ul>
      <li>
        <h3>Vencen Hoy</h3>
        <ul>${expenseToday}</ul>
      </li>
      <li>
        <h3>Vencen Mañana</h3>
        <ul>${expenseTomorrow}</ul>
      </li>
    </ul>
  `
}

const buildHTMLMail = (item: GroupedByUser) => {
  return `
      <div>
        <ul>
          <li>
            <h1>Gastos fijos</h1>
            ${buildHTMLExpenses(item.expenses)}
          </li>
          <li>
            <h1>Tarjetas de crédito</h1>
            ${buildHTMLCreditCardExpenses(item.creditCardExpenses)}
          </li>
        </ul>
      </div>
    `
}

export async function POST() {
  const headersList = headers()
  const token = headersList.get('Authorization')
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    })
  }
  try {
    const expirations = await getExpensesToExpire()

    const promises = expirations.map((item) => {
      const html = buildHTMLMail(item)
      return mailer.sendMail({
        from: '"GastApp" <gastapp.ingeit@gmail.com>',
        to: item.userEmail,
        subject: 'Próximos vencimientos',
        html,
      })
    })
    await Promise.all(promises)

    return new Response('GET request successful', {
      status: 200,
    })
  } catch (error) {
    return new Response('Error', {
      status: 500,
    })
  }
}
