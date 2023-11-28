'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatLocaleDate, getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
  setExpensePaymentSummaryPaid,
} from '@/services/summary'
import { CreditCardPaymentSummary, ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { NumericFormat } from 'react-number-format'

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

  useEffect(() => {
    setExpenseItems(expenseSummaries)
    setCreditCardExpenseItems(creditCardExpenseSummaries)
  }, [expenseSummaries, creditCardExpenseSummaries])

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

  const handleItemAmountChange = (inputAmount: string, id: string) => {
    const amount = removeCurrencyMaskFromInput(inputAmount)
    const newSelectedItems = expenseSummaries!.map((item) => {
      if (item.id === id) {
        return { ...item, amount }
      }
      return item
    })
    setExpenseItems(newSelectedItems)
  }

  const handleItemChangePaymentType = (paymentTypeId: string, id: string) => {
    const newSelectedItems = expenseItems.map((item) => {
      if (item.id === id) {
        return { ...item, paymentTypeId }
      }
      return item
    })
    setExpenseItems(newSelectedItems)
  }
  const handleItemChangePaymentSource = (paymentSourceId: string, id: string) => {
    const newSelectedItems = expenseItems.map((item) => {
      if (item.id === id) {
        return { ...item, paymentSourceId }
      }
      return item
    })
    setExpenseItems(newSelectedItems)
  }

  const payExpense = (item: ExpensePaymentSummary) => {
    setExpensePaymentSummaryPaid(item)
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
      {expenseItems?.length ? (
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
                      onChange={(e) => handleItemChangePaymentType(e.target.value, item.id)}
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
                      onChange={(e) => handleItemChangePaymentSource(e.target.value, item.id)}
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
                        onChange={(e) => handleItemAmountChange(e.target.value, item.id)}
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
          <form></form>
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
              <p>
                {item.expense.sharedWith.map((person) => (
                  <div key={person.id}>
                    {person.name}: {formatCurrency(item.expense.amount / (item.expense.sharedWith.length + 1))}{' '}
                    {item.expense.description}
                  </div>
                ))}
              </p>
            </div>
          ))}
        {/* <p>total: {getSharedTotalForPerson(item.expense.sharedWith)}</p> */}
      </section>
    </div>
  )
}
