'use client'
import { formatCurrency, formatLocaleDate, formatLocaleDueDate, getTodayDueDate } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  addExpenseToSummary,
  setNoNeedExpensePaymentSummary,
  undoExpensePaymentSummaryPaid,
  setCreditCardPaymentSummaryPaid,
} from '@/services/summary'
import { CreditCardPaymentSummary, ExpensePaymentSummary, Prisma } from '@prisma/client'
import React, { useState } from 'react'
import Link from 'next/link'
import { PAGES_URL } from '@/lib/routes'
import { undoCCExpensePaymentSummaryPaid } from '@/services/credit-card'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import LinkButton from '@/components/ui/link-button'
import { ExclamationCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import SharedExpenses from './shared-expenses'

type ExpensesPaymentSummaryWithInclude = Prisma.ExpensePaymentSummaryGetPayload<{
  include: {
    expense: {
      include: {
        sharedWith: true
      }
    }
  }
}>

type ExpensesWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    sharedWith: true
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

export default function ExpensesSummary({
  expenseSummaries,
  expenses,
  creditCardExpenseSummaries,
  date,
}: {
  expenseSummaries: ExpensesPaymentSummaryWithInclude[]
  expenses: ExpensesWithInclude[]
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
  date: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  const undoExpensePayment = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await undoExpensePaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const undoCCExpensePayment = async (item: CreditCardPaymentSummary) => {
    setIsLoading(true)
    await undoCCExpensePaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const payExpense = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await setExpensePaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const payCCExpense = async (item: CreditCardPaymentSummary) => {
    setIsLoading(true)
    await setCreditCardPaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const dontPayExpense = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await setNoNeedExpensePaymentSummary(item)
    setIsLoading(false)
  }

  const getExpenseStatus = (expense: ExpensesPaymentSummaryWithInclude | CreditCardExpensesWithInclude) => {
    switch (expense.paid) {
      case true:
        if (expense.amount === 0) return <span className="leading-tight uppercase font-semibold">Omitido</span>
        return <span className="leading-tight uppercase font-semibold text-money">Pagado</span>
      case false:
        if (expense.dueDate) {
          if (expense.dueDate < getTodayDueDate())
            return <span className="leading-tight uppercase font-semibold text-red-500">Vencido</span>
          if (expense.dueDate === getTodayDueDate())
            return (
              <span className="leading-tight uppercase font-semibold text-orange-500 animate-bounce">Vence hoy</span>
            )
        }
        return <span className="leading-tight uppercase font-semibold animate-pulse text-cyan-500">Pendiente</span>
    }
  }

  const getTotals = () => {
    const expenses = expenseSummaries.reduce(
      (acc, expense) => {
        if (expense.paid) return { ...acc, paid: acc.paid + expense.amount }
        return { ...acc, notPaid: acc.notPaid + expense.amount }
      },
      { paid: 0, notPaid: 0 }
    )
    const ccExpenses = creditCardExpenseSummaries.reduce(
      (acc, expense) => {
        if (expense.paid) return { ...acc, paid: acc.paid + expense.amount }
        return { ...acc, notPaid: acc.notPaid + expense.amount }
      },
      { paid: 0, notPaid: 0 }
    )
    return {
      paid: expenses.paid + ccExpenses.paid,
      notPaid: expenses.notPaid + ccExpenses.notPaid,
      amount:
        expenseSummaries.reduce((acc, exp) => (acc += exp.amount), 0) +
        creditCardExpenseSummaries.reduce((acc, exp) => (acc += exp.amount), 0),
    }
  }

  const getNewExpenses = () =>
    expenses
      .filter((expense) => !expenseSummaries.some((expenseSummary) => expenseSummary.expenseId === expense.id))
      .map((expense) => (
        <div key={expense.id} className="flex bg-gray-50 p-3 rounded-xl gap-2 h-[86px]">
          <div className="w-full rounded-[10px] px-2 flex flex-col">
            <div className="flex-1 flex justify-between items-center font-medium">
              <span className="leading-tight lowercase first-letter:uppercase text-lg">{expense.description}</span>
              <span className="leading-tight text-xl">{formatCurrency(expense.amount)}</span>
            </div>
            <button
              className="w-fit uppercase text-xs text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300"
              onClick={() => addExpenseToSummary(date, expense)}
            >
              agregar al resumen actual
            </button>
          </div>
        </div>
      ))

  return (
    <section id="expense-content">
      <div className="max-w-xl md:overflow-x-visible md:flex-wrap md:mx-auto p-4 flex gap-2 justify-start flex-nowrap overflow-x-auto no-scrollbar">
        <div className="shadow-lg p-4 shrink-0 flex flex-col w-64 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white leading-tight">
          <span className="text-lg font-semibold uppercase">total</span>
          <span className="text-gray-100 uppercase">gastos</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getTotals().amount)}</span>
        </div>
        <div className="shadow-lg p-4 shrink-0  flex flex-col w-64 rounded-xl bg-gradient-to-r from-lime-500 to-money text-white">
          <span className="text-lg font-semibold uppercase">pagado</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getTotals().paid)}</span>
        </div>
        <div className="shadow-lg p-4 shrink-0  flex flex-col w-64 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white">
          <span className="text-lg font-semibold uppercase">no pagado</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getTotals().notPaid)}</span>
        </div>
        <SharedExpenses expenseSummaries={expenseSummaries} creditCardExpenseSummaries={creditCardExpenseSummaries} />
      </div>
      <div className="max-w-xl mx-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-semibold">Gastos</p>
          <LinkButton href={PAGES_URL.EXPENSES.CREATE}>
            <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
              <PlusIcon className="w-5 " />
              <span className="">Nuevo</span>
            </div>
          </LinkButton>
        </div>
        {expenseSummaries.length ? (
          <div className="flex flex-col gap-2">
            {getNewExpenses()}
            {expenseSummaries.map((item) => (
              <Popover key={item.id} className="relative">
                <PopoverButton className="flex justify-center items-center gap-1 w-full">
                  <div className="flex bg-gray-50 p-3 rounded-xl gap-2 h-[86px] w-full">
                    <div className="w-full rounded-[10px] px-2 flex flex-col">
                      <div className="flex-1 flex justify-between items-end font-medium">
                        <span className="leading-tight lowercase first-letter:uppercase text-lg">
                          {item.expense.description}
                        </span>
                        <span className="leading-tight text-xl">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                        <span className="leading-tight block lowercase first-letter:uppercase">Vencimiento</span>
                        <span className="leading-tight block lowercase first-letter:uppercase">
                          {item.paymentChannel}
                        </span>
                      </div>
                      <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                        <span>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</span>
                        {getExpenseStatus(item)}
                      </div>
                    </div>
                  </div>
                </PopoverButton>
                <PopoverPanel
                  anchor="bottom end"
                  transition
                  className="flex flex-col bg-white p-4 shadow-2xl rounded-md w-fit h-fit !max-w-[250px] transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                  <span>Acciones</span>
                  {item.paid ? (
                    <div className="hover:bg-orange-500 hover:text-white rounded-md p-1">
                      <button onClick={() => undoExpensePayment(item)}>Deshacer pago</button>
                    </div>
                  ) : (
                    <>
                      <Link
                        className="block hover:bg-orange-500 hover:text-white rounded-md p-1"
                        href={`${PAGES_URL.EXPENSES.EDIT(item.expenseId)}?callbackUrl=/dashboard`}
                      >
                        Editar
                      </Link>
                      <button
                        className="block w-full text-left hover:bg-orange-500 hover:text-white rounded-md p-1"
                        onClick={() => dontPayExpense(item)}
                      >
                        Omitir pago
                      </button>
                      <button
                        className="block w-full text-left hover:bg-orange-500 hover:text-white rounded-md p-1"
                        onClick={() => payExpense(item)}
                      >
                        Pagar
                      </button>
                    </>
                  )}
                </PopoverPanel>
              </Popover>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-r from-gray-500 to-gray-900 rounded-xl text-white">
            <div className="flex gap-4 items-center">
              <ExclamationCircleIcon className="w-8 h-8 text-orange-500" />
              <span>No se generó el resumen para {formatLocaleDate(date)}</span>
            </div>
            <button
              className="bg-orange-500 text-white hover:bg-gray-600 px-2 py-1 rounded-md text-base mt-4"
              onClick={() => generateExpenseSummaryForMonth(date)}
            >
              Generar resumen
            </button>
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto p-4">
        <p className="text-lg font-semibold mb-2">Tarjetas de crédito</p>
        {creditCardExpenseSummaries.length ? (
          <div className="flex flex-col gap-2">
            {creditCardExpenseSummaries.map((item) => (
              <Popover key={item.id} className="relative">
                <PopoverButton className="flex justify-center items-center gap-1 w-full">
                  <div className="flex bg-gray-50 p-3 rounded-xl gap-2 h-[86px] w-full">
                    <div className="w-full rounded-[10px] px-2 flex flex-col">
                      <div className="flex-1 flex justify-between items-end font-medium">
                        <span className="leading-tight uppercase text-lg">{item.creditCard.name}</span>
                        <span className="leading-tight text-xl">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                        <span className="leading-tight block lowercase first-letter:uppercase">Vencimiento</span>
                      </div>
                      <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                        <span>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</span>
                        {getExpenseStatus(item)}
                      </div>
                    </div>
                  </div>
                </PopoverButton>
                <PopoverPanel
                  anchor="bottom end"
                  transition
                  className="flex flex-col bg-white p-4 shadow-2xl rounded-md w-fit h-fit !max-w-[250px] transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                >
                  <span>Acciones</span>
                  <Link
                    className="block hover:bg-orange-500 hover:text-white rounded-md p-1"
                    href={`${PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(item.creditCardId, item.id)}`}
                  >
                    Ver detalle
                  </Link>
                  {item.paid ? (
                    <div className="hover:bg-orange-500 hover:text-white rounded-md p-1">
                      <button onClick={() => undoCCExpensePayment(item)}>Deshacer pago</button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="block w-full text-left hover:bg-orange-500 hover:text-white rounded-md p-1"
                        onClick={() => payCCExpense(item)}
                      >
                        Pagar
                      </button>
                    </>
                  )}
                </PopoverPanel>
              </Popover>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-r from-gray-500 to-gray-900 rounded-xl text-white">
            <div className="flex gap-4 items-center">
              <ExclamationCircleIcon className="w-8 h-8 text-orange-500" />
              <span>No se encontro ningun sumen para tarjetas de crédito {formatLocaleDate(date)}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
