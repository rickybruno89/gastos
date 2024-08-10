'use client'
import { Button } from '@/components/ui/button'
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
import { BellPlus, Check, EditIcon, MoreHorizontal } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { undoCCExpensePaymentSummaryPaid } from '@/services/credit-card'
import { Menu, MenuButton, MenuHeading, MenuItem, MenuItems, MenuSection, MenuSeparator } from '@headlessui/react'
import LinkButton from '@/components/ui/link-button'
import { PlusIcon } from '@heroicons/react/24/outline'

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

  // const getStatusBadge = (expense: ExpensesPaymentSummaryWithInclude | CreditCardExpensesWithInclude) => {
  //   switch (expense.paid) {
  //     case true:
  //       if (expense.amount === 0) return <Badge variant={'secondary'}>Omitido</Badge>
  //       return (
  //         <Badge className="bg-green-500">
  //           <span className="flex justify-center gap-1 items-center">
  //             <Check className="w-4 h-4" /> Pagado
  //           </span>
  //         </Badge>
  //       )
  //     case false:
  //       if (expense.dueDate) {
  //         if (expense.dueDate < getTodayDueDate()) return <Badge className="bg-red-900">Vencido</Badge>
  //         if (expense.dueDate === getTodayDueDate())
  //           return <Badge className="bg-red-500 animate-pulse">Vence hoy</Badge>
  //       }
  //       return <Badge className="bg-cyan-500">Pendiente</Badge>
  //   }
  // }

  const getExpenseStatus = (expense: ExpensesPaymentSummaryWithInclude | CreditCardExpensesWithInclude) => {
    switch (expense.paid) {
      case true:
        if (expense.amount === 0) return <span className="leading-tight uppercase font-semibold">Pago omitido</span>
        return <span className="leading-tight uppercase font-semibold text-money">Pagado</span>
      case false:
        if (expense.dueDate) {
          if (expense.dueDate < getTodayDueDate()) return <Badge className="bg-red-900">Vencido</Badge>
          if (expense.dueDate === getTodayDueDate())
            return (
              <span className="leading-tight uppercase font-semibold text-orange-500 animate-pulse">Vence hoy</span>
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

  const getCreditCardsTotal = () => {
    const ccExpenses = creditCardExpenseSummaries.reduce(
      (acc, expense) => {
        if (expense.paid) return { ...acc, paid: acc.paid + expense.amount }
        return { ...acc, notPaid: acc.notPaid + expense.amount }
      },
      { paid: 0, notPaid: 0 }
    )
    return {
      paid: ccExpenses.paid,
      notPaid: ccExpenses.notPaid,
      amount: creditCardExpenseSummaries.reduce((acc, exp) => (acc += exp.amount), 0),
    }
  }

  const getExpensesTotal = () => {
    const expenses = expenseSummaries.reduce(
      (acc, expense) => {
        if (expense.paid) return { ...acc, paid: acc.paid + expense.amount }
        return { ...acc, notPaid: acc.notPaid + expense.amount }
      },
      { paid: 0, notPaid: 0 }
    )
    return {
      paid: expenses.paid,
      notPaid: expenses.notPaid,
      amount: expenseSummaries.reduce((acc, exp) => (acc += exp.amount), 0),
    }
  }

  const getNewExpenses = () =>
    expenses
      .filter((expense) => !expenseSummaries.some((expenseSummary) => expenseSummary.expenseId === expense.id))
      .map((expense) => (
        <div key={expense.id} className="flex bg-gray-50 p-3 rounded-xl gap-2 h-[86px]">
          <div className="w-full rounded-[10px] px-2 flex flex-col">
            <div className="flex-1 flex justify-between items-end font-medium">
              <span className="leading-tight lowercase first-letter:uppercase text-lg">{expense.description}</span>
              <span className="leading-tight text-xl text-money">{formatCurrency(expense.amount)}</span>
            </div>
            <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
              agregar al resumen
            </div>
          </div>
        </div>
      ))

  return (
    <section id="expense-content">
      <div className="px-4 flex gap-2 mb-4 justify-start flex-nowrap overflow-x-auto no-scrollbar">
        <div className=" p-4 shrink-0 flex flex-col w-64 rounded-xl bg-gradient-to-bl from-violet-600 to-purple-600 text-white leading-tight">
          <span className="text-lg font-semibold uppercase">total</span>
          <span className="text-gray-100 uppercase">gastos fijos</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getExpensesTotal().amount)}</span>
        </div>
        <div className=" p-4 shrink-0  flex flex-col w-64 rounded-xl bg-gradient-to-bl from-amber-500 to-orange-500 text-white">
          <span className="text-lg font-semibold uppercase">TOTAL</span>
          <span className="text-gray-100 uppercase">Tarjetas crédito</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getCreditCardsTotal().amount)}</span>
        </div>
        <div className=" p-4 shrink-0  flex flex-col w-64 rounded-xl bg-gradient-to-bl from-amber-500 to-orange-500 text-white">
          <span className="text-lg font-semibold uppercase">TOTAL</span>
          <span className="text-gray-100 uppercase">Tarjetas crédito</span>
          <span className="text-3xl font-bold mt-3 text-center">{formatCurrency(getCreditCardsTotal().amount)}</span>
        </div>
      </div>
      {expenseSummaries.length ? (
        <div className="max-w-xl mx-auto p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-lg font-semibold">Gastos fijos</p>
            <LinkButton href={PAGES_URL.EXPENSES.CREATE}>
              <PlusIcon className="w-5 text-orange-400" />
              <span className="text-orange-400">Nuevo</span>
            </LinkButton>
          </div>
          <div className="flex flex-col gap-2">
            {getNewExpenses()}
            {expenseSummaries.map((item) => (
              <Menu key={item.id}>
                <MenuButton>
                  <div className="flex bg-gray-50 p-3 rounded-xl gap-2 h-[86px]">
                    <div className="w-full rounded-[10px] px-2 flex flex-col">
                      <div className="flex-1 flex justify-between items-end font-medium">
                        <span className="leading-tight lowercase first-letter:uppercase text-lg">
                          {item.expense.description}
                        </span>
                        <span className="leading-tight text-xl text-money">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                        <span className="leading-tight block lowercase first-letter:uppercase">{`${item.paymentType.name} - ${item.paymentSource.name}`}</span>
                        <span className="leading-tight block lowercase first-letter:uppercase">Vencimiento</span>
                      </div>
                      <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                        {getExpenseStatus(item)}
                        <span>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</span>
                      </div>
                    </div>
                  </div>
                </MenuButton>
                <MenuItems
                  anchor="bottom end"
                  className="bg-white p-4 w-40 shadow-2xl rounded-xl -translate-y-[74px] -translate-x-3"
                >
                  <MenuSection>
                    <MenuHeading className="text-sm">Acciones</MenuHeading>
                    {item.paid ? (
                      <MenuItem>
                        <div className="data-[focus]:bg-orange-500 data-[focus]:text-white rounded-md p-1">
                          <button onClick={() => undoExpensePayment(item)}>Deshacer pago</button>
                        </div>
                      </MenuItem>
                    ) : (
                      <>
                        <MenuItem>
                          <Link
                            className="block data-[focus]:bg-orange-500 data-[focus]:text-white rounded-md p-1"
                            href={`${PAGES_URL.EXPENSES.EDIT(item.expenseId)}?callbackUrl=/dashboard`}
                          >
                            Editar
                          </Link>
                        </MenuItem>
                        <MenuItem>
                          <button
                            className="block w-full text-left data-[focus]:bg-orange-500 data-[focus]:text-white rounded-md p-1"
                            onClick={() => dontPayExpense(item)}
                          >
                            Omitir pago
                          </button>
                        </MenuItem>
                        <MenuItem>
                          <button
                            className="block w-full text-left data-[focus]:bg-orange-500 data-[focus]:text-white rounded-md p-1"
                            onClick={() => payExpense(item)}
                          >
                            Pagar
                          </button>
                        </MenuItem>
                      </>
                    )}
                  </MenuSection>
                </MenuItems>
              </Menu>
            ))}
          </div>
        </div>
      ) : (
        <>
          <Alert variant="default">
            <ExclamationTriangleIcon className="h-5 w-5 " />
            <AlertTitle>No se generó el resumen para {formatLocaleDate(date)}</AlertTitle>
            <AlertDescription className="mt-4">
              <Button size={'sm'} onClick={() => generateExpenseSummaryForMonth(date)}>
                Generar resumen
              </Button>
            </AlertDescription>
          </Alert>
        </>
      )}
    </section>
  )
}
