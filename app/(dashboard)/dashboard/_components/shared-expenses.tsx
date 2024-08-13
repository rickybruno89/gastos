'use client'
import { formatCurrency } from '@/lib/utils'
import { Prisma } from '@prisma/client'
import { useState } from 'react'
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

type ExpensesWithInclude = Prisma.ExpensePaymentSummaryGetPayload<{
  include: {
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
    installments: string
  }[]
}

const calcSharedExpenses = (
  expenseSummaries: ExpensesWithInclude[],
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
) => {
  const expensesByPerson: ExpensesByPerson[] = []
  expenseSummaries.forEach((item) => {
    item.expense.sharedWith.forEach((person) => {
      if (!item.amount) return
      const amountPerPerson = item.amount / (item.expense.sharedWith.length + 1)

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
        installments: 'Recurrente',
        amountToPay: amountPerPerson,
        amount: item.amount,
      })
    })
  })

  creditCardExpenseSummaries.forEach((summary) => {
    summary.itemHistoryPayment.forEach((payment) => {
      payment.creditCardExpenseItem.sharedWith.forEach((person) => {
        if (!payment.installmentsAmount) return
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
          description: payment.creditCardExpenseItem.description,
          installments: !payment.creditCardExpenseItem.recurrent
            ? `Cuota ${payment.installmentsPaid} de ${payment.installmentsQuantity}`
            : 'Recurrente',
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
  let [isOpen, setIsOpen] = useState(false)
  const [sharedPersonData, setSharedPersonData] = useState<ExpensesByPerson | null>(null)

  const handleOpenModal = (sharedPersonData: ExpensesByPerson) => {
    setIsOpen(true)
    setSharedPersonData(sharedPersonData)
  }

  return (
    <>
      {sharedExpenses.length
        ? sharedExpenses.map((shared) => (
            <div
              key={shared.id}
              className="cursor-pointer shadow-lg p-4 shrink-0 flex flex-col w-64 rounded-xl bg-gradient-to-r from-gray-500 to-gray-900 text-white leading-tight"
              onClick={() => handleOpenModal(shared)}
            >
              <span className="text-lg font-semibold uppercase">{shared.name}</span>
              <span className="text-gray-100 uppercase">Gastos compartidos</span>
              <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(shared.total)}</span>
            </div>
          ))
        : null}
      <Dialog
        open={isOpen}
        as="div"
        onClose={() => setIsOpen(false)}
        transition
        className="fixed inset-0 flex w-screen items-center justify-center bg-black/50  backdrop-blur-sm p-4 transition duration-300 ease-out data-[closed]:opacity-0"
      >
        <div className="fixed inset-0 z-10 w-screen ">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-md rounded-xl bg-gradient-to-r from-gray-700 to-gray-900 p-6 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              {sharedPersonData && (
                <>
                  <DialogTitle as="h3" className="text-base/7 font-medium ">
                    <div className="flex justify-between text-white mb-4">
                      <span className="font-bold text-lg leading-none">{sharedPersonData.name}</span>
                      <span className="font-bold text-lg leading-none">{formatCurrency(sharedPersonData.total)}</span>
                    </div>
                  </DialogTitle>
                  <div className="flex flex-col gap-2 overflow-y-auto max-h-[590px] no-scrollbar">
                    {sharedPersonData.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-2 rounded-md bg-gray-500 text-white"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">{item.description}</span>
                          <span className="text-gray-200">{`Total ${formatCurrency(item.amount)}`}</span>
                        </div>
                        <div className="flex flex-col ">
                          <span className="font-bold text-right">{formatCurrency(item.amountToPay)}</span>
                          <span className="text-gray-200">{item.installments}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="mt-4">
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-orange-500 text-white py-1.5 px-3 text-sm/6 font-semibold  shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1"
                  onClick={() => setIsOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  )
}
