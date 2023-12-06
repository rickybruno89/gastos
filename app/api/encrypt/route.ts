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
  await Promise.all(transactions)
  return new Response('OK', {
    status: 200,
  })
}
