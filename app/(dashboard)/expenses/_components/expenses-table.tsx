'use client'
import React, { useEffect, useRef, useState } from 'react'
import ButtonDelete from '@/components/ui/button-delete'
import { formatCurrency, formatLocaleDueDate } from '@/lib/utils'
import { deleteExpenseItem } from '@/services/expense'
import { InformationCircleIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { EditIcon, MoreHorizontal, PlusIcon } from 'lucide-react'
import ButtonTooltip from '@/components/ui/button-tooltip'
import { Prisma } from '@prisma/client'
import { PAGES_URL } from '@/lib/routes'
import LinkButton from '@/components/ui/link-button'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { debounce } from 'lodash'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

type DataWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    paymentSource: true
    paymentType: true
    sharedWith: true
  }
}>

export default function ExpensesTable({ expenses }: { expenses: DataWithInclude[] }) {
  const [filteredExpenses, setFilteredExpenses] = useState(expenses)

  const handleSearchDebouncedRef = useRef(
    debounce((searchValue) => {
      setFilteredExpenses(expenses.filter((item) => item.description.toLowerCase().includes(searchValue.toLowerCase())))
    }, 500)
  ).current

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    handleSearchDebouncedRef(value)
  }

  return (
    <>
      <div className="flex gap-2 items-center mb-2 flex-wrap">
        <h1 className="text-xl font-bold">Items</h1>
        <LinkButton href={PAGES_URL.EXPENSES.CREATE}>
          <PlusIcon className="w-5" />
          Agregar
        </LinkButton>
        <div className="relative w-full md:w-fit">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <MagnifyingGlassIcon className="w-5 text-gray-500" />
          </div>
          <input
            type="search"
            onChange={handleInputChange}
            className="block w-full p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Buscar por nombre"
          />
        </div>
      </div>
      {filteredExpenses.length ? (
        <section className="rounded-md bg-white p-4 md:p-6">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow className="text-xs md:text-sm">
                <TableHead className="sticky left-0 bg-white">Descripción</TableHead>
                <TableHead>Forma de pago</TableHead>
                <TableHead>Canal de pago</TableHead>
                <TableHead>Compartido</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((item) => (
                <TableRow key={item.id} className="text-xs md:text-sm">
                  <TableCell className="sticky left-0 bg-white">{item.description}</TableCell>
                  <TableCell>{item.paymentType.name}</TableCell>
                  <TableCell>{item.paymentSource.name}</TableCell>
                  <TableCell>{item.sharedWith.map((person) => person.name).join(' - ')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                  <TableCell className="text-right flex flex-nowrap items-center justify-end">
                    <div className="flex items-center gap-2 justify-self-end self-center col-span-2">
                      <ButtonTooltip
                        action="click"
                        content={
                          <div>
                            Notas:{' '}
                            {item.notes ? (
                              <span className="">{item.notes}</span>
                            ) : (
                              <span className="italic">No hay notas</span>
                            )}
                          </div>
                        }
                        trigger={<InformationCircleIcon className="w-6 h-6 text-blue-500" />}
                      />
                      <ButtonTooltip
                        action="click"
                        content="Editar item"
                        trigger={
                          <Link href={PAGES_URL.EXPENSES.EDIT(item.id)}>
                            <EditIcon className="w-5 h-5" />
                          </Link>
                        }
                      />
                      <ButtonDelete action={deleteExpenseItem} id={item.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : (
        <h1>No hay items </h1>
      )}
    </>
  )
}
