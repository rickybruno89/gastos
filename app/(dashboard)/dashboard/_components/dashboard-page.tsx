'use client'
import { Button } from '@/components/ui/button'
import { getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
} from '@/services/summary'
import { CreditCardPaymentSummary, ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
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
}: {
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
}) {
  const [_, dispatchCreateExpenseSummaryForMonth] = useFormState(generateExpenseSummaryForMonth, {})

  const [expenseSummaries, setExpenseSummaries] = useState<ExpensesWithInclude[]>()
  const [creditCardExpenseSummaries, setCreditCardExpenseSummaries] = useState<CreditCardExpensesWithInclude[]>()
  const [selectedDate, setSelectedDate] = useState(getToday())

  useEffect(() => {
    const getSummaries = async () => {
      const expenseSummaries = await fetchExpenseSummariesForMonth(selectedDate)
      setExpenseSummaries(expenseSummaries)
      const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(selectedDate)
      setCreditCardExpenseSummaries(creditCardExpenseSummaries)
    }
    getSummaries()
  }, [selectedDate])

  const handleChangeDate = (date: string) => setSelectedDate(date)

  const handleItemAmountChange = (inputAmount: string, id: string) => {
    const amount = removeCurrencyMaskFromInput(inputAmount)
    const newSelectedItems = expenseSummaries!.map((item) => {
      if (item.id === id) {
        return { ...item, amount }
      }
      return item
    })
    setExpenseSummaries(newSelectedItems)
  }

  // const handleItemChangePaymentType = (paymentTypeId: string, id: string) => {
  //   const newSelectedItems = selectedItems.map((item) => {
  //     if (item.id === id) {
  //       return { ...item, paymentTypeId }
  //     }
  //     return item
  //   })
  //   setSelectedItems(newSelectedItems)
  // }
  // const handleItemChangePaymentSource = (paymentSourceId: string, id: string) => {
  //   const newSelectedItems = selectedItems.map((item) => {
  //     if (item.id === id) {
  //       return { ...item, paymentSourceId }
  //     }
  //     return item
  //   })
  //   setSelectedItems(newSelectedItems)
  // }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md bg-white p-4 md:p-6 w-fit flex gap-4">
        <h1>Seleccione el mes para ver los resumenes</h1>
        <input
          id="paymentBeginning"
          name="paymentBeginning"
          type="month"
          value={selectedDate}
          className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
          onChange={(e) => handleChangeDate(e.target.value)}
        />
      </section>
      {expenseSummaries?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <p className="font-bold">Gastos fijos</p>
          <div className="flex flex-col gap-4">
            <p className="mb-2 block text-sm font-medium">Seleccione los items a pagar</p>
            {expenseSummaries.map((item) => (
              <div key={item.expenseId} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{item.expense.description}</p>
                <p>{item.paymentType.name}</p>
                <p>{item.paymentSource.name}</p>

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
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <h1>No se encontro el resumen de gastos fijos.</h1>
          <form action={dispatchCreateExpenseSummaryForMonth}>
            <div className="flex justify-start gap-2 items-center">
              <h2>Generar resumen gastos fijos para mes</h2>
              <input
                id="date"
                name="date"
                type="month"
                defaultValue={selectedDate}
                className="peer rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              />
              <Button size={'sm'} type="submit">
                Generar
              </Button>
            </div>
          </form>
        </section>
      )}

      {creditCardExpenseSummaries?.length ? (
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
    </div>
  )
}
