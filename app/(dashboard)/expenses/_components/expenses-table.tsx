'use client'
import React, { useEffect, useRef, useState } from 'react'
import ButtonDelete from '@/components/ui/button-delete'
import { formatCurrency } from '@/lib/utils'
import { deleteExpenseItem } from '@/services/expense'
import { InformationCircleIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'
import { EditIcon, PlusIcon } from 'lucide-react'
import ButtonTooltip from '@/components/ui/button-tooltip'
import { Prisma } from '@prisma/client'
import { PAGES_URL } from '@/lib/routes'
import LinkButton from '@/components/ui/link-button'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { debounce } from 'lodash'

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
        <div className="flex flex-col gap-1 w-full rounded-md bg-white p-4 md:p-6">
          {filteredExpenses.map((item) => (
            <div key={item.id} className="flex flex-col">
              <div className="flex flex-col md:grid lg:grid-cols-8">
                <p className="self-center col-span-2 font-bold">{item.description}</p>
                <p className="self-center">{formatCurrency(item.amount)}</p>
                <p className="self-center col-span-2">
                  {item.paymentType.name} - {item.paymentSource.name}
                </p>
                <div className="self-center">
                  {item.sharedWith.length ? (
                    <p>
                      Compartido con <span>{item.sharedWith.map((person) => person.name).join(' - ')}</span>
                    </p>
                  ) : (
                    <p className="self-center">No compartido</p>
                  )}
                </div>
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
              </div>
              <div className="my-2 h-px w-full bg-gray-300" />
            </div>
          ))}
        </div>
      ) : (
        <h1>No hay items </h1>
      )}
    </>
  )
}
