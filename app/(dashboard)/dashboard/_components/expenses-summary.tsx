'use client'
import {
  formatCurrency,
  formatLocaleDate,
  formatLocaleDueDate,
  getPaymentChannelSafeText,
  getTodayDueDate,
  removeCurrencyMaskFromInput,
} from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  addExpenseToSummary,
  setNoNeedExpensePaymentSummary,
  undoExpensePaymentSummaryPaid,
  setCreditCardPaymentSummaryPaid,
} from '@/services/summary'
import { updateExpenseAmount } from '@/services/expense'
import { CreditCardPaymentSummary, ExpensePaymentSummary, Prisma } from '@prisma/client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PAGES_URL } from '@/lib/routes'
import { undoCCExpensePaymentSummaryPaid } from '@/services/credit-card'
import { ExclamationCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import SharedExpenses from './shared-expenses'
import ButtonLoadingSpinner from '@/components/ui/button-loading-spinner'
import SwipeableListItem from '@/components/ui/swipeable-list-item'
import Spinner from '@/components/ui/spinner'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { NumericFormat } from 'react-number-format'

export type ExpensesPaymentSummaryWithInclude = Prisma.ExpensePaymentSummaryGetPayload<{
  include: {
    expense: {
      include: {
        sharedWith: true
      }
    }
  }
}>

export type ExpensesWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    sharedWith: true
  }
}>

export type CreditCardExpensesWithInclude = Prisma.CreditCardPaymentSummaryGetPayload<{
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
  expenseSummariesRaw,
  expensesRaw,
  creditCardExpenseSummariesRaw,
  date,
}: {
  expenseSummariesRaw: ExpensesPaymentSummaryWithInclude[]
  expensesRaw: ExpensesWithInclude[]
  creditCardExpenseSummariesRaw: CreditCardExpensesWithInclude[]
  date: string
}) {
  const [isLoading, setIsLoading] = useState(true)

  const [expenseSummaries, setExpenseSummaries] = useState(
    expenseSummariesRaw.map((item) => ({ ...item, isLoading: false }))
  )
  const [expenses, setExpenses] = useState(expensesRaw.map((item) => ({ ...item, isLoading: false })))
  const [creditCardExpenseSummaries, setCreditCardExpenseSummaries] = useState(
    creditCardExpenseSummariesRaw.map((item) => ({ ...item, isLoading: false }))
  )
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [editingAmount, setEditingAmount] = useState<number>(0)

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 700)
    setExpenseSummaries(expenseSummariesRaw.map((item) => ({ ...item, isLoading: false })))
    setExpenses(expensesRaw.map((item) => ({ ...item, isLoading: false })))
    setCreditCardExpenseSummaries(creditCardExpenseSummariesRaw.map((item) => ({ ...item, isLoading: false })))
  }, [expenseSummariesRaw, expensesRaw, creditCardExpenseSummariesRaw])

  const handleGenerarResumen = () => {
    setIsLoading(true)
    generateExpenseSummaryForMonth(date)
  }

  const undoExpensePayment = async (item: ExpensePaymentSummary) => {
    const newExpenseSummaries = expenseSummaries.map((expenseSummary) => ({
      ...expenseSummary,
      isLoading: expenseSummary.id === item.id ? true : false,
    }))
    setExpenseSummaries(newExpenseSummaries)
    await undoExpensePaymentSummaryPaid(item)
  }

  const payExpense = async (item: ExpensePaymentSummary) => {
    const newExpenseSummaries = expenseSummaries.map((expenseSummary) => ({
      ...expenseSummary,
      isLoading: expenseSummary.id === item.id ? true : false,
    }))
    setExpenseSummaries(newExpenseSummaries)
    await setExpensePaymentSummaryPaid(item)
  }

  const dontPayExpense = async (item: ExpensePaymentSummary) => {
    const newExpenseSummaries = expenseSummaries.map((expenseSummary) => ({
      ...expenseSummary,
      isLoading: expenseSummary.id === item.id ? true : false,
    }))
    setExpenseSummaries(newExpenseSummaries)
    await setNoNeedExpensePaymentSummary(item)
  }

  const undoCCExpensePayment = async (item: CreditCardPaymentSummary) => {
    const newCreditCardExpenseSummaries = creditCardExpenseSummaries.map((creditCardExpense) => ({
      ...creditCardExpense,
      isLoading: creditCardExpense.id === item.id ? true : false,
    }))
    setCreditCardExpenseSummaries(newCreditCardExpenseSummaries)
    await undoCCExpensePaymentSummaryPaid(item)
  }

  const payCCExpense = async (item: CreditCardPaymentSummary) => {
    const newCreditCardExpenseSummaries = creditCardExpenseSummaries.map((creditCardExpense) => ({
      ...creditCardExpense,
      isLoading: creditCardExpense.id === item.id ? true : false,
    }))
    setCreditCardExpenseSummaries(newCreditCardExpenseSummaries)
    await setCreditCardPaymentSummaryPaid(item)
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

  const handleStartEditAmount = (expenseId: string, currentAmount: number) => {
    setEditingExpenseId(expenseId)
    setEditingAmount(currentAmount)
  }

  const handleSaveAmount = async (expensePaymentSummaryId: string) => {
    const result = await updateExpenseAmount(expensePaymentSummaryId, editingAmount)
    if (result.success) {
      // Actualizar el estado local
      setExpenseSummaries((prev) =>
        prev.map((item) => (item.id === expensePaymentSummaryId ? { ...item, amount: editingAmount } : item))
      )
      setEditingExpenseId(null)
      setEditingAmount(0)
    }
  }

  const handleCancelEdit = () => {
    setEditingExpenseId(null)
    setEditingAmount(0)
  }

  const getTotals = () => {
    const expenses = expenseSummaries.reduce(
      (acc, expense) => {
        const currency = expense.currency || 'ARS'
        if (expense.paid) {
          return {
            ...acc,
            paid: acc.paid + expense.amount,
            paidARS: currency === 'ARS' ? acc.paidARS + expense.amount : acc.paidARS,
            paidUSD: currency === 'USD' ? acc.paidUSD + expense.amount : acc.paidUSD,
          }
        }
        return {
          ...acc,
          notPaid: acc.notPaid + expense.amount,
          notPaidARS: currency === 'ARS' ? acc.notPaidARS + expense.amount : acc.notPaidARS,
          notPaidUSD: currency === 'USD' ? acc.notPaidUSD + expense.amount : acc.notPaidUSD,
        }
      },
      { paid: 0, notPaid: 0, paidARS: 0, paidUSD: 0, notPaidARS: 0, notPaidUSD: 0 }
    )

    const ccExpenses = creditCardExpenseSummaries.reduce(
      (acc, expense) => {
        // Para credit cards, usamos totalAmountARS y totalAmountUSD si existen
        const amountARS = expense.totalAmountARS || (expense.amount || 0)
        const amountUSD = expense.totalAmountUSD || 0

        if (expense.paid) {
          return {
            ...acc,
            paid: acc.paid + (amountARS + amountUSD),
            paidARS: acc.paidARS + amountARS,
            paidUSD: acc.paidUSD + amountUSD,
          }
        }
        return {
          ...acc,
          notPaid: acc.notPaid + (amountARS + amountUSD),
          notPaidARS: acc.notPaidARS + amountARS,
          notPaidUSD: acc.notPaidUSD + amountUSD,
        }
      },
      { paid: 0, notPaid: 0, paidARS: 0, paidUSD: 0, notPaidARS: 0, notPaidUSD: 0 }
    )

    return {
      paid: expenses.paid + ccExpenses.paid,
      notPaid: expenses.notPaid + ccExpenses.notPaid,
      amount:
        expenseSummaries.reduce((acc, exp) => (acc += exp.amount), 0) +
        creditCardExpenseSummaries.reduce((acc, exp) => (acc += (exp.totalAmountARS || exp.amount || 0) + (exp.totalAmountUSD || 0)), 0),
      paidARS: expenses.paidARS + ccExpenses.paidARS,
      paidUSD: expenses.paidUSD + ccExpenses.paidUSD,
      notPaidARS: expenses.notPaidARS + ccExpenses.notPaidARS,
      notPaidUSD: expenses.notPaidUSD + ccExpenses.notPaidUSD,
      totalARS: expenses.paidARS + expenses.notPaidARS + ccExpenses.paidARS + ccExpenses.notPaidARS,
      totalUSD: expenses.paidUSD + expenses.notPaidUSD + ccExpenses.paidUSD + ccExpenses.notPaidUSD,
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

  return isLoading ? (
    <LoadingSpinner />
  ) : (
    <section id="expense-content">
      <div className="w-full max-w-md mx-auto mt-8 " />
      <div className="max-w-xl md:overflow-x-visible md:flex-wrap md:mx-auto p-4 flex gap-2 justify-start flex-nowrap overflow-x-auto no-scrollbar">
        {/* Total ARS */}
        <div className="shadow-lg p-4 shrink-0 flex flex-col w-64 rounded-xl bg-gradient-to-r from-green-600 to-green-800 text-white leading-tight">
          <span className="text-lg font-semibold uppercase flex items-center gap-2">
            Total ARS
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">$</span>
          </span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getTotals().totalARS)}</span>
          <div className="mt-2 text-sm flex justify-between">
            <span>Pagado: {formatCurrency(getTotals().paidARS)}</span>
          </div>
          <div className="text-sm flex justify-between">
            <span>Pendiente: {formatCurrency(getTotals().notPaidARS)}</span>
          </div>
        </div>

        {/* Total USD */}
        {getTotals().totalUSD > 0 && (
          <div className="shadow-lg p-4 shrink-0 flex flex-col w-64 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 text-white leading-tight">
            <span className="text-lg font-semibold uppercase flex items-center gap-2">
              Total USD
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">US$</span>
            </span>
            <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getTotals().totalUSD)}</span>
            <div className="mt-2 text-sm flex justify-between">
              <span>Pagado: {formatCurrency(getTotals().paidUSD)}</span>
            </div>
            <div className="text-sm flex justify-between">
              <span>Pendiente: {formatCurrency(getTotals().notPaidUSD)}</span>
            </div>
          </div>
        )}

        {/* Total General */}
        <div className="shadow-lg p-4 shrink-0 flex flex-col w-64 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white leading-tight">
          <span className="text-lg font-semibold uppercase">total</span>
          <span className="text-gray-100 uppercase text-xs">gastos (mixto)</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getTotals().amount)}</span>
        </div>

        <SharedExpenses expenseSummaries={expenseSummaries} creditCardExpenseSummaries={creditCardExpenseSummaries} />
      </div>
      <div className="max-w-xl mx-auto p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-lg font-semibold">Gastos</p>
          <Link href={PAGES_URL.EXPENSES.CREATE}>
            <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
              <PlusIcon className="w-5 " />
              <span className="">Nuevo</span>
            </div>
          </Link>
        </div>
        {expenseSummaries.length ? (
          <div className="flex flex-col gap-2">
            {getNewExpenses()}
            {expenseSummaries.map((item) => (
              <SwipeableListItem
                key={item.id}
                card={
                  <div className="flex bg-gray-50 p-3 rounded-l-xl gap-2 h-[86px] w-full items-center justify-center">
                    {item.isLoading ? (
                      <Spinner />
                    ) : (
                      <div className="w-full px-2 flex flex-col">
                        <div className="flex-1 flex justify-between items-end font-medium">
                          <div className="flex items-center gap-2">
                            <span className="leading-tight lowercase first-letter:uppercase text-lg">
                              {item.expense.description}
                            </span>
                            {item.currency === 'USD' && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase font-semibold">
                                USD
                              </span>
                            )}
                            {item.expense.isAnnualPayment && (
                              <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full uppercase font-semibold">
                                Anual
                              </span>
                            )}
                          </div>
                          {editingExpenseId === item.id ? (
                            <div className="flex items-center gap-1">
                              <NumericFormat
                                inputMode="decimal"
                                className="rounded-md w-24 px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-orange-500"
                                value={editingAmount}
                                prefix={'$ '}
                                thousandSeparator="."
                                decimalScale={2}
                                decimalSeparator=","
                                onChange={(e) => setEditingAmount(removeCurrencyMaskFromInput(e.target.value))}
                                autoFocus
                              />
                              <button
                                className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                                onClick={() => handleSaveAmount(item.id)}
                              >
                                ✓
                              </button>
                              <button
                                className="text-xs bg-gray-400 text-white px-2 py-1 rounded"
                                onClick={handleCancelEdit}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span
                              className="leading-tight text-xl cursor-pointer hover:bg-orange-100 px-2 py-1 rounded"
                              onClick={() => !item.paid && handleStartEditAmount(item.id, item.amount)}
                            >
                              {formatCurrency(item.amount)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                          <span className="leading-tight block lowercase first-letter:uppercase">Vencimiento</span>
                          <span className="leading-tight block lowercase first-letter:uppercase">
                            {getPaymentChannelSafeText(item.paymentChannel)}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                          <span>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</span>
                          {getExpenseStatus(item)}
                        </div>
                      </div>
                    )}
                  </div>
                }
                buttons={
                  item.paid ? (
                    <button
                      className="w-20 flex justify-center items-center p-2 bg-red-700 text-white rounded-r-xl"
                      onClick={() => undoExpensePayment(item)}
                    >
                      Deshacer pago
                    </button>
                  ) : (
                    <>
                      <Link
                        className="w-20 flex justify-center items-center p-2 text-center bg-violet-600 text-white "
                        href={`${PAGES_URL.EXPENSES.EDIT(item.expenseId)}?callbackUrl=/dashboard`}
                      >
                        Editar
                      </Link>
                      <button
                        className="w-20 flex justify-center items-center p-2 bg-orange-500 text-white"
                        onClick={() => dontPayExpense(item)}
                      >
                        Omitir pago
                      </button>
                      <button
                        className="w-20 flex justify-center items-center p-2 bg-money rounded-r-xl text-white"
                        onClick={() => payExpense(item)}
                      >
                        Pagar
                      </button>
                    </>
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-r from-gray-500 to-gray-900 rounded-xl text-white">
            <div className="flex gap-4 items-center">
              <ExclamationCircleIcon className="w-8 h-8 text-orange-500" />
              <span>No se generó el resumen para {formatLocaleDate(date)}</span>
            </div>
            {isLoading ? (
              <div className="">
                <ButtonLoadingSpinner />
              </div>
            ) : (
              <button
                className="bg-orange-500 text-white hover:bg-gray-600 px-2 py-1 rounded-md text-base mt-4"
                onClick={handleGenerarResumen}
              >
                Generar Resumen
              </button>
            )}
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto p-4">
        <p className="text-lg font-semibold mb-2">Tarjetas de crédito</p>
        {creditCardExpenseSummaries.length ? (
          <div className="flex flex-col gap-2">
            {creditCardExpenseSummaries.map((item) => (
              <SwipeableListItem
                key={item.id}
                card={
                  <div className="flex bg-gray-50 p-3 rounded-l-xl gap-2 h-[86px] w-full justify-center items-center">
                    {item.isLoading ? (
                      <Spinner />
                    ) : (
                      <div className="w-full px-2 flex flex-col">
                        <div className="flex-1 flex justify-between items-end font-medium">
                          <div className="flex flex-col">
                            <span className="leading-tight uppercase text-lg">{item.creditCard.name}</span>
                            {item.creditCard.lastFourDigits && (
                              <span className="text-xs text-gray-400">•••• {item.creditCard.lastFourDigits}</span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {item.totalAmountARS && item.totalAmountARS > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">ARS</span>
                                <span className="leading-tight text-lg">{formatCurrency(item.totalAmountARS)}</span>
                              </div>
                            ) : null}
                            {item.totalAmountUSD && item.totalAmountUSD > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">USD</span>
                                <span className="leading-tight text-lg">{formatCurrency(item.totalAmountUSD)}</span>
                              </div>
                            ) : null}
                            {!item.totalAmountARS && !item.totalAmountUSD ? (
                              <span className="leading-tight text-xl">{formatCurrency(item.amount)}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                          <span className="leading-tight block lowercase first-letter:uppercase">Vencimiento</span>
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                          <span>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</span>
                          {getExpenseStatus(item)}
                        </div>
                      </div>
                    )}
                  </div>
                }
                buttons={
                  <>
                    <Link
                      className="w-20 flex justify-center items-center text-center p-2 bg-violet-600 text-white"
                      href={`${PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(item.creditCardId, item.id)}`}
                    >
                      Ver detalle
                    </Link>
                    {item.paid ? (
                      <button
                        className="w-20 flex justify-center items-center p-2 bg-orange-500 text-white rounded-r-xl"
                        onClick={() => undoCCExpensePayment(item)}
                      >
                        Deshacer pago
                      </button>
                    ) : (
                      <>
                        <button
                          className="w-20 flex justify-center items-center p-2 bg-money rounded-r-xl text-white"
                          onClick={() => payCCExpense(item)}
                        >
                          Pagar
                        </button>
                      </>
                    )}
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <div className="p-4 bg-gradient-to-r from-gray-500 to-gray-900 rounded-xl text-white">
            <div className="flex gap-4 items-center">
              <ExclamationCircleIcon className="w-8 h-8 text-orange-500" />
              <span>No se encontro ningun sumen para tarjetas de crédito {formatLocaleDate(date)}</span>
            </div>
            <p className='my-2'>Para generar el resumen de las tarjetas, debe ir a &quot;Tarjetas de Crédito&quot; desde el menu de navegacion o haga clic en el siguiente enlace</p>
            <Link
              className="w-fit uppercase text-xs text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300"
              href={PAGES_URL.CREDIT_CARDS.BASE_PATH}
            >
              Ir a tarjetas
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
