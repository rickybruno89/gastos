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

  const getStatusBadge = (expense: ExpensesPaymentSummaryWithInclude | CreditCardExpensesWithInclude) => {
    switch (expense.paid) {
      case true:
        if (expense.amount === 0) return <Badge variant={'secondary'}>Omitido</Badge>
        return (
          <Badge className="bg-green-500">
            <span className="flex justify-center gap-1 items-center">
              <Check className="w-4 h-4" /> Pagado
            </span>
          </Badge>
        )
      case false:
        if (expense.dueDate) {
          if (expense.dueDate < getTodayDueDate()) return <Badge className="bg-red-900">Vencido</Badge>
          if (expense.dueDate === getTodayDueDate())
            return <Badge className="bg-red-500 animate-pulse">Vence hoy</Badge>
        }
        return <Badge className="bg-cyan-500">Pendiente</Badge>
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
        <TableRow key={expense.id} className="text-xs md:text-sm">
          <TableCell className="sticky left-0 bg-white">{expense.description}</TableCell>
          <TableCell>{expense.paymentType.name}</TableCell>
          <TableCell>{expense.paymentSource.name}</TableCell>
          <TableCell>{expense.dueDate ? formatLocaleDueDate(expense.dueDate) : '-'}</TableCell>
          <TableCell>
            <Badge className="bg-cyan-500 animate-pulse">
              <span className="flex justify-center gap-1 items-center ">
                <BellPlus className="w-4 h-4" /> Nuevo
              </span>
            </Badge>
          </TableCell>
          <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
          <TableCell className="text-right">
            <Button size={'sm'} variant={'link'} onClick={() => addExpenseToSummary(date, expense)}>
              Agregar a este resumen
            </Button>
          </TableCell>
        </TableRow>
      ))

  return (
    <section id="expense-content" className="rounded-md bg-white md:p-6">
      {expenseSummaries.length ? (
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow className="text-xs md:text-sm">
              <TableHead className="sticky left-0 bg-white">Descripción</TableHead>
              <TableHead>Forma de pago</TableHead>
              <TableHead>Canal de pago</TableHead>
              <TableHead>Fecha de vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Compartido</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="text-xs md:text-sm">
              <TableCell className="sticky left-0 py-2 uppercase font-bold">
                Gastos Fijos
              </TableCell>
            </TableRow>
            {getNewExpenses()}
            {expenseSummaries.map((item) => (
              <TableRow key={item.id} className="text-xs md:text-sm">
                <TableCell className="sticky left-0 bg-white capitalize">{item.expense.description.toLowerCase()}</TableCell>
                <TableCell className='!capitalize'>{item.paymentType.name.toLowerCase()}</TableCell>
                <TableCell className='!capitalize'>{item.paymentSource.name.toLowerCase()}</TableCell>
                <TableCell>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</TableCell>
                <TableCell>{getStatusBadge(item)}</TableCell>
                <TableCell className='!capitalize'>{item.expense.sharedWith.map((person) => person.name.toLowerCase()).join(' - ')}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-right flex flex-nowrap items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button disabled={isLoading} variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      {item.paid ? (
                        <>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => undoExpensePayment(item)}>
                            Deshacer pago
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem className="cursor-pointer">
                            <Link
                              className="w-full"
                              href={`${PAGES_URL.EXPENSES.EDIT(item.expenseId)}?callbackUrl=/dashboard`}
                            >
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => dontPayExpense(item)}>
                            Omitir pago
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => payExpense(item)}>
                            Pagar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="text-xs md:text-sm">
              <TableCell className="sticky left-0 py-2 uppercase font-bold">
                Tarjetas crédito
              </TableCell>
            </TableRow>
            {creditCardExpenseSummaries.map((item) => (
              <TableRow key={item.id} className="text-xs md:text-sm">
                <TableCell className="sticky left-0 bg-white">{item.creditCard.name}</TableCell>
                <TableCell>{item.paymentType.name}</TableCell>
                <TableCell>{item.paymentSource.name}</TableCell>
                <TableCell>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</TableCell>
                <TableCell>{getStatusBadge(item)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-right flex flex-nowrap items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button disabled={isLoading} variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer">
                        <Link
                          className="w-full"
                          href={`${PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(item.creditCardId, item.id)}`}
                        >
                          Ver detalle
                        </Link>
                      </DropdownMenuItem>
                      {item.paid ? (
                        <>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => undoCCExpensePayment(item)}>
                            Deshacer pago
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => payCCExpense(item)}>
                            Pagar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter className="border-b border-b-gray-200">
            <TableRow className="bg-white">
              <TableCell className="py-0.5" colSpan={5} />
              <TableCell className="py-0.5 pt-2 text-right">Total</TableCell>
              <TableCell className="text-right py-0.5">{formatCurrency(getTotals().amount)}</TableCell>
            </TableRow>
            <TableRow className="bg-white">
              <TableCell className="py-0.5" colSpan={5} />
              <TableCell className="py-0.5 text-right">Pagado</TableCell>
              <TableCell className="text-right py-0.5">{formatCurrency(getTotals().paid)}</TableCell>
            </TableRow>
            <TableRow className="bg-white">
              <TableCell className="py-0.5" colSpan={5} />
              <TableCell className="py-0.5 pb-2 text-right">No Pagado</TableCell>
              <TableCell className="text-right py-0.5">{formatCurrency(getTotals().notPaid)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
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
