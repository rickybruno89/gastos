'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatLocaleDate, formatLocaleDueDate, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  updateAmountExpenseSummary,
  updatePaymentTypeExpenseSummary,
  updatePaymentSourceExpenseSummary,
  addExpenseToSummary,
} from '@/services/summary'
import { ExpensePaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import React, { useState } from 'react'
import { NumericFormat } from 'react-number-format'
import { debounce } from 'lodash'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import Link from 'next/link'
import { PAGES_URL } from '@/lib/routes'
import { CheckCircle2, XCircleIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

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
  const isOpen = useSearchParams().get('showing') || ''
  const [isLoading, setIsLoading] = useState(false)

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

  const payExpense = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await setExpensePaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const handleScrollAccordion = (renderedItem: string) => {
    setTimeout(() => {
      if (renderedItem) {
        const element = document.getElementById('expense-content') as HTMLElement
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 200)
  }

  return (
    <>
      {expenseSummaries?.length ? (
        <section id="expense-content">
          <Accordion type="single" collapsible defaultValue={isOpen} onValueChange={handleScrollAccordion}>
            <AccordionItem value="expense-content">
              <AccordionTrigger className="max-w-fit py-1">
                <p className="mr-5 font-bold">Gastos fijos</p>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-md bg-white p-4 md:p-6 w-full lg:w-fit flex flex-col gap-2">
                  {expenseSummaries.map((item) => (
                    <div key={item.expenseId} className="flex flex-col gap-3">
                      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-2 lg:items-center">
                        <div className="flex justify-start gap-2 items-center">
                          {item.paid ? (
                            <CheckCircle2 className="w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="w-5 text-red-500" />
                          )}
                          <div className="lg:self-center flex-col flex">
                            <Link
                              className="font-bold"
                              href={`${PAGES_URL.EXPENSES.EDIT(item.expenseId)}?callbackUrl=${
                                PAGES_URL.DASHBOARD.BASE_PATH
                              }?date=${date}&showing=expense-content`}
                            >
                              {item.expense.description}
                            </Link>
                            {item.dueDate ? (
                              <span className="text-xs">Vence el {formatLocaleDueDate(item.dueDate)}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex justify-between gap-1">
                          <select
                            className="rounded-md text-xs w-full"
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
                          <select
                            className="rounded-md text-xs w-full"
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
                        {item.paid ? (
                          <span className="font-bold text-right">{formatCurrency(item.amount)}</span>
                        ) : (
                          <div className="flex justify-between items-center gap-1">
                            <NumericFormat
                              className="rounded-md text-xs w-full md:w-fit p-2"
                              inputMode="decimal"
                              value={item.amount}
                              onChange={(e) => handleExpenseAmountChange(item, e.target.value)}
                              prefix={'$ '}
                              thousandSeparator="."
                              decimalScale={2}
                              decimalSeparator=","
                            />
                            <Button disabled={isLoading} size={'sm'} onClick={() => payExpense(item)}>
                              Pagar
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="h-px bg-gray-500" />
                    </div>
                  ))}
                  {expenses
                    .filter(
                      (expense) => !expenseSummaries.some((expenseSummary) => expenseSummary.expenseId === expense.id)
                    )
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
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
