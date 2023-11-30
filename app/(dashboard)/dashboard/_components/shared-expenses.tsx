import { formatCurrency } from '@/lib/utils'
import { Prisma } from '@prisma/client'

type ExpensesWithInclude = Prisma.ExpensePaymentSummaryGetPayload<{
  include: {
    paymentSource: true
    paymentType: true
    expense: {
      include: {
        sharedWith: true
      }
    }
  }
}>

type CreditCardExpensesWithInclude = Prisma.CreditCardPaymentSummaryGetPayload<{
  include: {
    creditCard: true
    paymentSource: true
    paymentType: true
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

type ExpensesByPerson = {
  id: string
  name: string
  total: number
  items: {
    id: string
    description: string
    amountToPay: number
  }[]
}

const calcSharedExpenses = (
  expenseSummaries: ExpensesWithInclude[],
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
) => {
  const expensesByPerson: ExpensesByPerson[] = []
  expenseSummaries.forEach((item) => {
    item.expense.sharedWith.forEach((person) => {
      const amountPerPerson = item.expense.amount / (item.expense.sharedWith.length + 1)

      let existingPerson = expensesByPerson.find((p) => p.id === person.id)

      if (!existingPerson) {
        existingPerson = {
          id: person.id,
          total: 0,
          name: person.name,
          items: [],
        }
        expensesByPerson.push(existingPerson)
      }
      existingPerson.total += amountPerPerson

      existingPerson.items.push({
        id: item.id,
        description: item.expense.description,
        amountToPay: amountPerPerson,
      })
    })
  })

  creditCardExpenseSummaries.forEach((summary) => {
    summary.itemHistoryPayment.forEach((payment) => {
      payment.creditCardExpenseItem.sharedWith.forEach((person) => {
        const amountPerPerson = payment.installmentsAmount / (payment.creditCardExpenseItem.sharedWith.length + 1)

        let existingPerson = expensesByPerson.find((p) => p.id === person.id)

        if (!existingPerson) {
          existingPerson = {
            id: person.id,
            total: 0,
            name: person.name,
            items: [],
          }
          expensesByPerson.push(existingPerson)
        }

        existingPerson.total += amountPerPerson

        existingPerson.items.push({
          id: payment.id,
          description: `${payment.creditCardExpenseItem.description} - cuota ${payment.installmentsPaid} de ${payment.installmentsQuantity}`,
          amountToPay: amountPerPerson,
        })
      })
    })
  })
  return expensesByPerson
}

export default function SharedExpenses({
  expenseSummaries,
  creditCardExpenseSummaries,
}: {
  expenseSummaries: ExpensesWithInclude[]
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
}) {
  const sharedExpenses = calcSharedExpenses(expenseSummaries, creditCardExpenseSummaries)

  return (
    <>
      <p className="font-bold">Gastos compartidos</p>
      <div className="flex flex-wrap gap-4">
        {sharedExpenses.length ? (
          sharedExpenses.map((shared) => (
            <div className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col" key={shared.id}>
              <p className="font-bold">{shared.name}</p>
              {shared.items.map((item) => (
                <div key={item.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="md:mr-6">{item.description}</span>
                    <span className="font-bold">{formatCurrency(item.amountToPay)}</span>
                  </div>
                </div>
              ))}
              <p className="font-bold text-right mt-2">TOTAL {formatCurrency(shared.total)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col">No hay datos para mostrar</div>
        )}
      </div>
    </>
  )
}
