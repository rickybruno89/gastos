import prisma from '@/lib/prisma'
import { encryptString } from '@/lib/utils'

export async function GET() {
  const expenses = await prisma.expense.findMany()
  const transactions = []
  for (const expense of expenses) {
    transactions.push(
      prisma.expense.update({
        data: {
          description: encryptString(expense.description),
        },
        where: {
          id: expense.id,
        },
      })
    )
  }
  const creditCardExpenses = await prisma.creditCardExpenseItem.findMany()
  for (const creditCardExpense of creditCardExpenses) {
    transactions.push(
      prisma.creditCardExpenseItem.update({
        data: {
          description: encryptString(creditCardExpense.description),
        },
        where: {
          id: creditCardExpense.id,
        },
      })
    )
  }
  await Promise.all(transactions)
  return new Response('OK', {
    status: 200,
  })
}
