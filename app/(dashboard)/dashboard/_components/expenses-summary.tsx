'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatLocaleDate, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  updateAmountExpenseSummary,
  updatePaymentTypeExpenseSummary,
  updatePaymentSourceExpenseSummary,
  addExpenseToSummary,
} from '@/services/summary'
import { Expense, ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import React from 'react'
import { NumericFormat } from 'react-number-format'
import { debounce } from 'lodash'

type ExpensesPaymentSummaryWithInclude = Prisma.ExpensePaymentSummaryGetPayload<{
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

type ExpensesWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    paymentSource: true
    paymentType: true
    sharedWith: true
  }
}>

export default function ExpensesSummary({
  paymentTypes,
  paymentSources,
  expenseSummaries,
  expenses,
  date,
}: {
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
  expenseSummaries: ExpensesPaymentSummaryWithInclude[]
  expenses: ExpensesWithInclude[]
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
      {expenseSummaries?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-full lg:w-fit flex flex-col gap-2">
          <p className="font-bold">Gastos fijos</p>
          {expenseSummaries.map((item) => (
            <div key={item.expenseId} className="flex flex-col gap-2">
              <div className="flex flex-col lg:grid lg:grid-cols-5 gap-4">
                <p className="font-bold lg:self-center">{item.expense.description}</p>
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
                    <span className="text-sm  lg:justify-self-center lg:self-center">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-green-500  lg:justify-self-center lg:self-center">PAGADO</span>
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
              <div className="h-px bg-gray-300" />
            </div>
          ))}
          {expenses
            .filter((expense) => !expenseSummaries.some((expenseSummary) => expenseSummary.expenseId === expense.id))
            .map((expense) => (
              <div key={expense.id} className="flex gap-4 items-center">
                <p className="font-bold">{expense.description}</p>
                <p>{expense.paymentType.name}</p>
                <p>{expense.paymentSource.name}</p>
                <p>{formatCurrency(expense.amount)}</p>
                <Button size={'sm'} onClick={() => addExpenseToSummary(date, expense)}>
                  Agregar a este resumen
                </Button>
              </div>
            ))}
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
