import { formatCurrency } from '@/lib/utils'
import { Prisma } from '@prisma/client'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

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
    amount: number
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
        amount: item.expense.amount,
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
          description: `${payment.creditCardExpenseItem.description} ${
            !payment.creditCardExpenseItem.recurrent
              ? `- Cuota ${payment.installmentsPaid} de ${payment.installmentsQuantity}`
              : '- Recurrente'
          }`,
          amountToPay: amountPerPerson,
          amount: payment.installmentsAmount,
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
    <section>
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className="max-w-fit py-1">
            <p className="font-bold mr-5">Gastos compartidos</p>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-4">
              {sharedExpenses.length ? (
                sharedExpenses.map((shared) => (
                  <div className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col" key={shared.id}>
                    <p className="font-bold">{shared.name}</p>
                    {shared.items.map((item) => (
                      <div key={item.id}>
                        <div className="flex gap-8 md:gap-20 justify-between items-center">
                          <span>
                            {item.description} {`(${formatCurrency(item.amount)})`}
                          </span>
                          <span className="font-bold text-right">{formatCurrency(item.amountToPay)}</span>
                        </div>
                        <div className="h-px bg-gray-500" />
                      </div>
                    ))}
                    <div className="flex justify-end items-center gap-6 mt-4 font-bold">
                      <span>TOTAL </span>
                      <span>{formatCurrency(shared.total)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col">No hay datos para mostrar</div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
