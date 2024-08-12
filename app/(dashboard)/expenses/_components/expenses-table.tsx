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
import {
  Menu,
  MenuButton,
  MenuHeading,
  MenuItem,
  MenuItems,
  MenuSection,
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react'

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
        <div className="flex justify-between items-center w-full">
          <p className="text-lg font-semibold">Items</p>
          <LinkButton href={PAGES_URL.EXPENSES.CREATE}>
            <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
              <PlusIcon className="w-5 " />
              <span className="">Nuevo</span>
            </div>
          </LinkButton>
        </div>
      </div>
      {filteredExpenses.length ? (
        <div className="flex flex-col gap-2">
          {filteredExpenses.map((item) => (
            <div key={item.id} className="flex bg-gray-50 p-3 rounded-xl gap-2 ">
              <div className="w-full rounded-[10px] px-2 flex flex-col">
                <div className="flex-1 flex justify-between items-end font-medium">
                  <span className="leading-tight uppercase text-lg">{item.description}</span>
                  <span className="leading-tight text-xl">{formatCurrency(item.amount)}</span>
                </div>
                <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                  <span>{item.sharedWith.map((person) => person.name).join(' - ')}</span>
                  <span className="leading-tight block lowercase first-letter:uppercase">
                    {item.paymentType.name} - {item.paymentSource.name}
                  </span>
                </div>
                <div className="flex-1 flex justify-between items-end text-sm mt-2">
                  <Popover className="relative">
                    <PopoverButton className="flex justify-center items-center gap-1">
                      <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                      Notas
                    </PopoverButton>
                    <PopoverPanel
                      anchor="bottom"
                      className="flex flex-col bg-white p-4 shadow-2xl rounded-md w-fit h-fit !max-w-[250px]"
                    >
                      <div>
                        <span>Notas: </span>
                        {item.notes ? (
                          <span className="">{item.notes}</span>
                        ) : (
                          <span className="italic">No hay notas</span>
                        )}
                      </div>
                    </PopoverPanel>
                  </Popover>
                  <Popover className="relative">
                    <PopoverButton className="text-orange-500">Acciones</PopoverButton>
                    <PopoverPanel
                      anchor="bottom"
                      className="flex flex-col bg-white p-1 shadow-2xl rounded-md w-fit max-w-[160px]"
                    >
                      <Link
                        className="hover:bg-orange-500 hover:text-white rounded-md px-2 py-1"
                        href={PAGES_URL.EXPENSES.EDIT(item.id)}
                      >
                        Editar
                      </Link>
                      <ButtonDelete action={deleteExpenseItem} id={item.id}></ButtonDelete>
                    </PopoverPanel>
                  </Popover>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <h1>No hay items </h1>
      )}
    </>
  )
}
