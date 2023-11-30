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
  updateAmountCreditCardPaymentSummary,
  updatePaymentTypeCreditCardPaymentSummary,
  updatePaymentSourceCreditCardPaymentSummary,
} from '@/services/summary'
import { CreditCardPaymentSummary, ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import React, { useEffect, useState } from 'react'
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

type PaymentSourceBalanceWithInclude = Prisma.PaymentSourceGetPayload<{
  include: {
    expensePaymentSummaries: true
    creditCardPaymentSummaries: true
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

type PaymentSourceBalance = {
  name: string
  totalAmount: number
}

const calcPaymentSourceBalance = (paymentSourceBalance: PaymentSourceBalanceWithInclude[]) => {
  const totalsByName = paymentSourceBalance.map((obj) => {
    const totalExpense = obj.expensePaymentSummaries.reduce((acc, curr) => acc + curr.amount, 0)
    const totalCreditCard = obj.creditCardPaymentSummaries.reduce((acc, curr) => acc + curr.amount, 0)
    const total = totalExpense + totalCreditCard

    return {
      name: obj.name,
      totalAmount: total,
    }
  })
  return totalsByName
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
        const amountPerPerson =
          payment.creditCardExpenseItem.installmentsAmount / (payment.creditCardExpenseItem.sharedWith.length + 1)

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
          description: `${payment.creditCardExpenseItem.description} - cuota ${payment.creditCardExpenseItem.installmentsPaid} de ${payment.creditCardExpenseItem.installmentsQuantity}`,
          amountToPay: amountPerPerson,
        })
      })
    })
  })
  return expensesByPerson
}

export default function DashboardPage({
  paymentTypes,
  paymentSources,
  expenseSummaries,
  creditCardExpenseSummaries,
  paymentSourceBalance,
  date,
}: {
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
  expenseSummaries: ExpensesWithInclude[]
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
  paymentSourceBalance: PaymentSourceBalanceWithInclude[]
  date: string
}) {
  const sharedExpenses = calcSharedExpenses(expenseSummaries, creditCardExpenseSummaries)
  const paymentSourceItems = calcPaymentSourceBalance(paymentSourceBalance)

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

  const handleCreditCardAmountChange = debounce(
    (creditCardExpenseSummary: CreditCardPaymentSummary, inputAmount: string) => {
      const amount = removeCurrencyMaskFromInput(inputAmount)
      updateAmountCreditCardPaymentSummary(creditCardExpenseSummary, amount, date)
    },
    1000
  )

  const handleCreditCardChangePaymentType = (
    creditCardExpenseSummary: CreditCardPaymentSummary,
    paymentTypeId: string
  ) => {
    updatePaymentTypeCreditCardPaymentSummary(creditCardExpenseSummary, paymentTypeId, date)
  }
  const handleCreditCardChangePaymentSource = (
    creditCardExpenseSummary: CreditCardPaymentSummary,
    paymentSourceId: string
  ) => {
    updatePaymentSourceCreditCardPaymentSummary(creditCardExpenseSummary, paymentSourceId, date)
  }

  const payCreditCardExpense = (item: CreditCardExpensesWithInclude) => {
    setCreditCardPaymentSummaryPaid(item)
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

      <p className="font-bold">Tarjetas de Crédito</p>
      {creditCardExpenseSummaries?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {creditCardExpenseSummaries.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{item.creditCard.name}</p>
                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentTypeId"
                      value={item.paymentTypeId}
                      onChange={(e) => handleCreditCardChangePaymentType(item, e.target.value)}
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
                      onChange={(e) => handleCreditCardChangePaymentSource(item, e.target.value)}
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
                        onChange={(e) => handleCreditCardAmountChange(item, e.target.value)}
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

      <p className="font-bold">Balance necesario en cuentas</p>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col">
          {paymentSourceItems?.map((item) => (
            <div key={item.name}>
              <div className="flex justify-between gap-x-8 gap-y-4">
                <span className="font-bold">{item.name}</span>
                <span>{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="font-bold">Gastos compartidos</p>
      <div className="flex flex-wrap gap-4">
        {sharedExpenses?.map((shared) => (
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
        ))}
      </div>
    </>
  )
}
