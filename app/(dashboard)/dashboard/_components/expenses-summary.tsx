'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatLocaleDate, formatLocaleDueDate, getTodayDueDate } from '@/lib/utils'
import {
  generateExpenseSummaryForMonth,
  setExpensePaymentSummaryPaid,
  addExpenseToSummary,
  setNoNeedExpensePaymentSummary,
  undoExpensePaymentSummaryPaid,
} from '@/services/summary'
import { ExpensePaymentSummary, Prisma } from '@prisma/client'
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
  expenseSummaries,
  expenses,
  date,
}: {
  expenseSummaries: ExpensesPaymentSummaryWithInclude[]
  expenses: ExpensesWithInclude[]
  date: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  const undoExpensePayment = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await undoExpensePaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const payExpense = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await setExpensePaymentSummaryPaid(item)
    setIsLoading(false)
  }

  const dontPayExpense = async (item: ExpensePaymentSummary) => {
    setIsLoading(true)
    await setNoNeedExpensePaymentSummary(item)
    setIsLoading(false)
  }

  const getStatusBadge = (expense: ExpensesPaymentSummaryWithInclude) => {
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

  const getTotals = () =>
    expenseSummaries.reduce(
      (acc, expense) => {
        if (expense.paid) return { ...acc, paid: acc.paid + expense.amount }
        return { ...acc, notPaid: acc.notPaid + expense.amount }
      },
      { paid: 0, notPaid: 0 }
    )

  return (
    <section id="expense-content" className="rounded-md bg-white p-4 md:p-6">
      <p className="font-bold">Gastos fijos</p>
      {expenseSummaries.length ? (
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow className="text-xs md:text-sm">
              <TableHead className="sticky left-0 bg-white">Descripción</TableHead>
              <TableHead>Forma de pago</TableHead>
              <TableHead>Canal de pago</TableHead>
              <TableHead>Fecha de vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenseSummaries.map((item) => (
              <TableRow key={item.id} className="text-xs md:text-sm">
                <TableCell className="sticky left-0 bg-white">{item.expense.description}</TableCell>
                <TableCell>{item.paymentType.name}</TableCell>
                <TableCell>{item.paymentSource.name}</TableCell>
                <TableCell>{item.dueDate ? formatLocaleDueDate(item.dueDate) : '-'}</TableCell>
                <TableCell>{getStatusBadge(item)}</TableCell>
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
                            <Link href={`${PAGES_URL.EXPENSES.EDIT(item.expenseId)}?callbackUrl=/dashboard`}>
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
            {expenses
              .filter((expense) => !expenseSummaries.some((expenseSummary) => expenseSummary.expenseId === expense.id))
              .map((expense) => (
                <TableRow key={expense.id} className="text-xs md:text-sm animate-pulse">
                  <TableCell className="sticky left-0 bg-white">{expense.description}</TableCell>
                  <TableCell>{expense.paymentType.name}</TableCell>
                  <TableCell>{expense.paymentSource.name}</TableCell>
                  <TableCell>{expense.dueDate ? formatLocaleDueDate(expense.dueDate) : '-'}</TableCell>
                  <TableCell>
                    <Badge>
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
              ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell className="py-0.5" colSpan={5} />
              <TableCell className="py-0.5 pt-2 text-right">Total</TableCell>
              <TableCell className="text-right py-0.5 pr-4">
                {formatCurrency(expenseSummaries.reduce((acc, exp) => (acc += exp.amount), 0))}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-0.5" colSpan={5} />
              <TableCell className="py-0.5 text-right">Pagado</TableCell>
              <TableCell className="text-right py-0.5 pr-4">{formatCurrency(getTotals().paid)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-0.5" colSpan={5} />
              <TableCell className="py-0.5 pb-2 text-right">No Pagado</TableCell>
              <TableCell className="text-right py-0.5 pr-4">{formatCurrency(getTotals().notPaid)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      ) : (
        <>
          <Alert variant="default">
            <ExclamationTriangleIcon className="h-5 w-5 " />
            <AlertTitle>No se generó el resumen para {formatLocaleDate(date)}</AlertTitle>
            <AlertDescription className='mt-4'>
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
