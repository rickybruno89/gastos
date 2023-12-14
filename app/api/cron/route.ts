import { mailer } from '@/lib/mailer'
import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { decryptString, getDueDatePlusOneDay, getTodayDueDate } from '@/lib/utils'

interface ExpenseUser {
  userEmail: string
  expense: string
}

interface UserWithExpenses {
  userEmail: string
  expenses: string[]
}

const getExpensesToExpire = async (dueDate: string) => {
  const response = await prisma.expensePaymentSummary.findMany({
    where: {
      dueDate,
      paid: false,
    },
    select: {
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
  const dueTodayResponse = response.map((item) => ({
    userEmail: item.user.email,
    expense: decryptString(item.expense.description),
  })) as ExpenseUser[]

  const groupedByUserEmail: UserWithExpenses[] = Object.values(
    dueTodayResponse.reduce((acc, obj) => {
      const { userEmail, expense } = obj

      if (!acc[userEmail]) {
        acc[userEmail] = { userEmail, expenses: [] }
      }

      acc[userEmail].expenses.push(expense)

      return acc
    }, {} as Record<string, UserWithExpenses>)
  )
  return groupedByUserEmail
}

const buildHTMLMail = (title: string, expenses: string[]) => {
  let expenseString = ''
  for (const expense of expenses) {
    expenseString += `<li><h3>${expense}</h3></li>`
  }
  return `
      <div>
        <h1>${title}</h1>
        <ul>
          ${expenseString}
        </ul>
      </div>
    `
}

export async function POST() {
  await mailer.sendMail({
    from: '"GastApp" <gastapp.ingeit@gmail.com>',
    to: 'rbrunount@gmail.com',
    subject: 'Vencimientos de hoy',
    html: 'HOLA 1',
  })
  const headersList = headers()
  const token = headersList.get('Authorization')
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    })
  }
  await mailer.sendMail({
    from: '"GastApp" <gastapp.ingeit@gmail.com>',
    to: 'rbrunount@gmail.com',
    subject: 'Vencimientos de hoy',
    html: 'HOLA 2',
  })
  try {
    const expiresToday = await getExpensesToExpire(getTodayDueDate())
    const expiresTomorrow = await getExpensesToExpire(getDueDatePlusOneDay())

    const promisesToday = expiresToday.map((item) => {
      const html = buildHTMLMail('Gastos que vencen hoy', item.expenses)
      return mailer.sendMail({
        from: '"GastApp" <gastapp.ingeit@gmail.com>',
        to: item.userEmail,
        subject: 'Vencimientos de hoy',
        html,
      })
    })
    const res1 = await Promise.all(promisesToday)
    console.log('🚀 ~ file: route.ts:93 ~ POST ~ res1:', res1)

    const promisesTomorrow = expiresTomorrow.map((item) => {
      const html = buildHTMLMail('Gastos que vencen mañana', item.expenses)
      return mailer.sendMail({
        from: '"GastApp" <gastapp.ingeit@gmail.com>',
        to: item.userEmail,
        subject: 'Vencimientos de mañana',
        html,
      })
    })
    const res2 = await Promise.all(promisesTomorrow)
    console.log('🚀 ~ file: route.ts:105 ~ POST ~ res2:', res2)
    await mailer.sendMail({
      from: '"GastApp" <gastapp.ingeit@gmail.com>',
      to: 'rbrunount@gmail.com',
      subject: 'Vencimientos de hoy',
      html: 'HOLA 3',
    })
    return new Response('GET request successful', {
      status: 200,
    })
  } catch (error) {
    return new Response('Error', {
      status: 500,
    })
  }
}
