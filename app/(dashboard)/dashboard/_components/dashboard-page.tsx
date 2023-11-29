'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatLocaleDate, getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  setCreditCardPaymentSummaryPaid,
  updateAmountExpenseSummary,
  updatePaymentTypeExpenseSummary,
  updatePaymentSourceExpenseSummary,
} from '@/services/summary'
import { CreditCardPaymentSummary, ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { NumericFormat } from 'react-number-format'
import { debounce } from 'lodash'

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
  sharedWithName: string
  items: {
    totalAmount: number
    description: string
    mustPay: number
  }[]
}

export default function DashboardPage({
  paymentTypes,
  paymentSources,
  expenseSummaries,
  creditCardExpenseSummaries,
}: {
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
  expenseSummaries: ExpensesWithInclude[]
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') || getToday()
  const [expenseItems, setExpenseItems] = useState(expenseSummaries)
  const [creditCardExpenseItems, setCreditCardExpenseItems] = useState(creditCardExpenseSummaries)
  const [sharedExpenses, setSharedExpenses] = useState<ExpensesByPerson[]>()

  const calcSharedExpenses = () => {
    const expensesByPerson: ExpensesByPerson[] = []
    expenseItems.forEach((item) => {
      item.expense.sharedWith.forEach((person) => {
        const amountPerPerson = item.expense.amount / (item.expense.sharedWith.length + 1)

        let existingPerson = expensesByPerson.find((p) => p.sharedWithName === person.name)

        if (!existingPerson) {
          existingPerson = {
            sharedWithName: person.name,
            items: [],
          }
          expensesByPerson.push(existingPerson)
        }

        existingPerson.items.push({
          totalAmount: item.expense.amount,
          description: item.expense.description,
          mustPay: amountPerPerson,
        })
      })
    })

    creditCardExpenseItems.forEach((summary) => {
      summary.itemHistoryPayment.forEach((payment) => {
        payment.creditCardExpenseItem.sharedWith.forEach((person) => {
          const amountPerPerson =
            payment.creditCardExpenseItem.installmentsAmount / (payment.creditCardExpenseItem.sharedWith.length + 1)

          let existingPerson = expensesByPerson.find((p) => p.sharedWithName === person.name)

          if (!existingPerson) {
            existingPerson = {
              sharedWithName: person.name,
              items: [],
            }
            expensesByPerson.push(existingPerson)
          }

          existingPerson.items.push({
            totalAmount: payment.creditCardExpenseItem.installmentsAmount,
            description: payment.creditCardExpenseItem.description,
            mustPay: amountPerPerson,
          })
        })
      })
    })

    // Ahora expensesByPerson contiene la estructura deseada con la información agrupada por persona
    setSharedExpenses(expensesByPerson)
  }

  useEffect(() => {
    setExpenseItems(expenseSummaries)
    setCreditCardExpenseItems(creditCardExpenseSummaries)
    calcSharedExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseSummaries, creditCardExpenseSummaries])

  useEffect(() => {
    calcSharedExpenses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseItems, creditCardExpenseItems])

  useEffect(() => {
    router.push(pathname + '?' + createQueryString('date', date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleChangeDate = (date: string) => {
    router.push(pathname + '?' + createQueryString('date', date))
  }

  const handleExpenseAmountChange = debounce((expenseSummary: ExpensePaymentSummary, inputAmount: string) => {
    const amount = removeCurrencyMaskFromInput(inputAmount)
    const newSelectedItems = expenseSummaries!.map((item) => {
      if (item.id === expenseSummary.id) {
        return { ...item, amount }
      }
      return item
    })
    setExpenseItems(newSelectedItems)
    updateAmountExpenseSummary(expenseSummary, amount, date)
  }, 1000)

  const handleExpenseChangePaymentType = (expenseSummary: ExpensePaymentSummary, paymentTypeId: string) => {
    const newSelectedItems = expenseItems.map((item) => {
      if (item.id === expenseSummary.id) {
        return { ...item, paymentTypeId }
      }
      return item
    })
    setExpenseItems(newSelectedItems)
    updatePaymentTypeExpenseSummary(expenseSummary, paymentTypeId, date)
  }
  const handleExpenseChangePaymentSource = (expenseSummary: ExpensePaymentSummary, paymentSourceId: string) => {
    const newSelectedItems = expenseItems.map((item) => {
      if (item.id === expenseSummary.id) {
        return { ...item, paymentSourceId }
      }
      return item
    })
    setExpenseItems(newSelectedItems)
    updatePaymentSourceExpenseSummary(expenseSummary, paymentSourceId, date)
  }

  const payExpense = (item: ExpensePaymentSummary) => {
    setExpensePaymentSummaryPaid(item)
  }

  const handleCreditCardAmountChange = (inputAmount: string, id: string) => {
    const amount = removeCurrencyMaskFromInput(inputAmount)
    const newSelectedItems = creditCardExpenseItems!.map((item) => {
      if (item.id === id) {
        return { ...item, amount }
      }
      return item
    })
    setCreditCardExpenseItems(newSelectedItems)
  }

  const handleCreditCardChangePaymentType = (paymentTypeId: string, id: string) => {
    const newSelectedItems = creditCardExpenseItems.map((item) => {
      if (item.id === id) {
        return { ...item, paymentTypeId }
      }
      return item
    })
    setCreditCardExpenseItems(newSelectedItems)
  }
  const handleCreditCardChangePaymentSource = (paymentSourceId: string, id: string) => {
    const newSelectedItems = creditCardExpenseItems.map((item) => {
      if (item.id === id) {
        return { ...item, paymentSourceId }
      }
      return item
    })
    setCreditCardExpenseItems(newSelectedItems)
  }

  const payCreditCardExpense = (item: CreditCardExpensesWithInclude) => {
    setCreditCardPaymentSummaryPaid(item)
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md bg-white p-4 md:p-6 w-fit flex gap-4">
        <h1>Seleccione el mes para ver los resumenes</h1>
        <input
          type="month"
          value={date}
          className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
          onChange={(e) => handleChangeDate(e.target.value)}
        />
      </section>
      {expenseSummaries?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <p className="font-bold">Gastos fijos</p>
          <div className="flex flex-col gap-4">
            <p className="mb-2 block text-sm font-medium">Seleccione los items a pagar</p>
            {expenseItems.map((item) => (
              <div key={item.expenseId} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{item.expense.description}</p>
                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentTypeId"
                      defaultValue={item.paymentTypeId}
                      onChange={(e) => handleExpenseChangePaymentType(item, e.target.value)}
                    >
                      {paymentTypes.map((paymentType) => (
                        <option key={paymentType.id} value={paymentType.id}>
                          {paymentType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentSourceId"
                      defaultValue={item.paymentSourceId}
                      onChange={(e) => handleExpenseChangePaymentSource(item, e.target.value)}
                    >
                      {paymentSources.map((paymentSource) => (
                        <option key={paymentSource.id} value={paymentSource.id}>
                          {paymentSource.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {item.paid ? (
                  <>
                    <div className="flex justify-end items-center gap-4">
                      <span className="text-sm">{formatCurrency(item.amount)}</span>
                      <span className="text-green-500">PAGADO</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-end items-center gap-2">
                      <NumericFormat
                        className="rounded-md text-sm w-full md:w-28"
                        value={item.amount}
                        onChange={(e) => handleExpenseAmountChange(item, e.target.value)}
                        prefix={'$ '}
                        thousandSeparator="."
                        decimalScale={2}
                        decimalSeparator=","
                      />
                    </div>
                    <Button size={'sm'} onClick={() => payExpense(item)}>
                      Pagar
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <h1>No se encontro el resumen de gastos fijos.</h1>
          <div className="flex justify-start gap-2 items-center">
            <h2>Generar resumen gastos fijos para {formatLocaleDate(date)}</h2>
            <Button size={'sm'} onClick={() => generateExpenseSummaryForMonth(date)}>
              Generar
            </Button>
          </div>
        </section>
      )}

      {creditCardExpenseItems?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <p className="font-bold">Tarjetas de Crédito</p>
          <div className="flex flex-col gap-4">
            <p className="mb-2 block text-sm font-medium">Seleccione los items a pagar</p>
            {creditCardExpenseItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{item.creditCard.name}</p>
                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentTypeId"
                      defaultValue={item.paymentTypeId}
                      onChange={(e) => handleCreditCardChangePaymentType(e.target.value, item.id)}
                    >
                      {paymentTypes.map((paymentType) => (
                        <option key={paymentType.id} value={paymentType.id}>
                          {paymentType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentSourceId"
                      defaultValue={item.paymentSourceId}
                      onChange={(e) => handleCreditCardChangePaymentSource(e.target.value, item.id)}
                    >
                      {paymentSources.map((paymentSource) => (
                        <option key={paymentSource.id} value={paymentSource.id}>
                          {paymentSource.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {item.paid ? (
                  <>
                    <div className="flex justify-end items-center gap-4">
                      <span className="text-sm">{formatCurrency(item.amount)}</span>
                      <span className="text-green-500">PAGADO</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-end items-center gap-2">
                      <NumericFormat
                        className="rounded-md text-sm w-full md:w-28"
                        value={item.amount}
                        onChange={(e) => handleCreditCardAmountChange(e.target.value, item.id)}
                        prefix={'$ '}
                        thousandSeparator="."
                        decimalScale={2}
                        decimalSeparator=","
                      />
                    </div>
                    <Button size={'sm'} onClick={() => payCreditCardExpense(item)}>
                      Pagar
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <h1>No se encontro ningun resumen de tarjetas.</h1>
          <h1>Navegar a la pagina de &quot;Tarjetas de Crédito&quot; para generar los resumenes mensuales</h1>
        </section>
      )}
      <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
        <p>Gastos compartidos</p>
        {expenseItems
          .filter((item) => item.expense.sharedWith.length)
          .map((item) => (
            <div key={item.expenseId}>
              <span></span>
              <div>
                {item.expense.sharedWith.map((person) => (
                  <div key={person.id}>
                    {person.name}: {formatCurrency(item.expense.amount / (item.expense.sharedWith.length + 1))}{' '}
                    {item.expense.description}
                  </div>
                ))}
              </div>
            </div>
          ))}
        {/* <p>total: {getSharedTotalForPerson(item.expense.sharedWith)}</p> */}
      </section>
    </div>
  )
}
