'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatLocaleDate, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  updateAmountExpenseSummary,
  updatePaymentTypeExpenseSummary,
  updatePaymentSourceExpenseSummary,
} from '@/services/summary'
import { ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import React from 'react'
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

export default function ExpensesSummary({
  paymentTypes,
  paymentSources,
  expenseSummaries,
  date,
}: {
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
  expenseSummaries: ExpensesWithInclude[]
  date: string
}) {
  const handleExpenseAmountChange = debounce((expenseSummary: ExpensePaymentSummary, inputAmount: string) => {
    const amount = removeCurrencyMaskFromInput(inputAmount)
    updateAmountExpenseSummary(expenseSummary, amount, date)
  }, 1000)

  const handleExpenseChangePaymentType = (expenseSummary: ExpensePaymentSummary, paymentTypeId: string) => {
    updatePaymentTypeExpenseSummary(expenseSummary, paymentTypeId, date)
  }
  const handleExpenseChangePaymentSource = (expenseSummary: ExpensePaymentSummary, paymentSourceId: string) => {
    updatePaymentSourceExpenseSummary(expenseSummary, paymentSourceId, date)
  }

  const payExpense = (item: ExpensePaymentSummary) => {
    setExpensePaymentSummaryPaid(item)
  }

  return (
    <>
      <p className="font-bold">Gastos fijos</p>
      {expenseSummaries?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {expenseSummaries.map((item) => (
              <div key={item.expenseId} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{item.expense.description}</p>
                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentTypeId"
                      value={item.paymentTypeId}
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
                      value={item.paymentSourceId}
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
    </>
  )
}
