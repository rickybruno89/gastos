import Breadcrumbs from '@/components/ui/breadcrumbs'
import ButtonDelete from '@/components/ui/button-delete'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency, formatLocaleDate, formatLocaleDueDate } from '@/lib/utils'
import { deleteCreditCardExpenseItem, fetchCreditCardById } from '@/services/credit-card'
import { deleteCreditCardPaymentSummary } from '@/services/summary'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Edit } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const creditCard = await fetchCreditCardById(id)
  return (
    <main className="max-w-xl mx-auto">
      <div className="px-4">
        <Breadcrumbs
          breadcrumbs={[
            { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
            {
              label: `${creditCard?.name}`,
              href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
              active: true,
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-4">
        <section className="px-4">
          <div className="flex gap-4">
            <p className="text-lg font-semibold">{creditCard?.name}</p>{' '}
            <Link href={PAGES_URL.CREDIT_CARDS.EDIT(creditCard.id)} className="flex gap-2 text-blue-500">
              Editar <Edit className="w-5 " />
            </Link>
          </div>
        </section>
        <section>
          <div className="px-4 flex justify-between items-center mb-2">
            <p className="text-lg font-semibold">Resúmenes</p>
            <Link href={PAGES_URL.CREDIT_CARDS.SUMMARY.CREATE(id)}>
              <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
                <PlusIcon className="w-5 " />
                <span className="">Generar resumen</span>
              </div>
            </Link>
          </div>
          <div className="px-4 max-w-xl md:overflow-x-visible md:flex-wrap md:mx-auto flex gap-2 justify-start flex-nowrap overflow-x-auto no-scrollbar">
            {creditCard!.paymentSummaries.map((summary, index) => (
              <div
                key={summary.id}
                className="cursor-pointer shadow-lg px-4 py-2 shrink-0 flex flex-col w-60 justify-around rounded-xl bg-gradient-to-r from-gray-500 to-gray-900 text-white leading-tight"
              >
                <span className="font-semibold uppercase">{formatLocaleDate(summary.date)}</span>
                <span className="text-gray-100">Venc. {formatLocaleDueDate(summary.dueDate)}</span>
                <span className="text-xl font-bold mt-1 text-center">{formatCurrency(summary.amount)}</span>
                <div className="flex justify-between items-center">
                  <div>
                    {summary.paid ? (
                      <span className="text-green-500">PAGADO</span>
                    ) : (
                      <span className="text-red-500">NO PAGADO</span>
                    )}
                  </div>
                  <div className="flex gap-1 justify-center items-center">
                    {index === 0 ? <ButtonDelete action={deleteCreditCardPaymentSummary} id={summary.id} /> : null}
                    <Link href={PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(id, summary.id)}>Ver</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="px-4">
          <div className="flex flex-col gap-1 w-full rounded-md bg-white">
            <div className="flex justify-between items-center mb-2">
              <p className="text-lg font-semibold">Gastos</p>
              <Link href={PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(id)}>
                <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
                  <PlusIcon className="w-5 " />
                  <span className="">Agregar gasto</span>
                </div>
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {creditCard?.creditCardExpenseItems.length ? (
                creditCard.creditCardExpenseItems.map((item) => (
                  <div key={item.id} className="flex bg-gray-50 p-4 rounded-xl gap-2 ">
                    <div className="w-full rounded-[10px]  flex flex-col">
                      <div className="w-full rounded-[10px]  flex flex-col">
                        <div className="flex-1 flex justify-between items-end font-medium">
                          <span className="leading-tight lowercase first-letter:uppercase text-lg">
                            {item.description}
                          </span>
                          <span className="leading-tight text-xl">
                            {item.recurrent ? formatCurrency(item.installmentsAmount) : formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                          <span className="leading-tight block lowercase first-letter:uppercase">
                            Comienzo del pago
                          </span>
                          <span>
                            {item.recurrent
                              ? 'Pago recurrente'
                              : `Cuota ${item.installmentsPaid} de ${item.installmentsQuantity} 
                             ${formatCurrency(item.installmentsAmount)}`}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm text-gray-400">
                          <span className="leading-tight block lowercase first-letter:uppercase">
                            {formatLocaleDate(item.paymentBeginning)}
                          </span>
                          {item.sharedWith.length ? (
                            <span>Compartido con {item.sharedWith.map((person) => person.name).join(' - ')}</span>
                          ) : (
                            <span>No compartido</span>
                          )}
                        </div>
                        <div className="flex-1 flex justify-between items-end text-sm mt-2">
                          <Popover className="relative">
                            <PopoverButton className="flex justify-center items-center gap-1 focus-visible:outline-none focus:outline-none p-0.5">
                              <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                              <span>Notas</span>
                            </PopoverButton>
                            <PopoverPanel
                              anchor="bottom start"
                              transition
                              className="flex flex-col bg-white p-4 shadow-2xl rounded-md w-fit h-fit !max-w-[250px] transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
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
                            <PopoverButton className="text-orange-500 focus-visible:outline-none focus:outline-none">Acciones</PopoverButton>
                            <PopoverPanel
                              anchor="top end"
                              className="flex flex-col bg-white p-4 shadow-2xl rounded-md w-fit h-fit !max-w-[250px] transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
                            >
                              <span>Acciones</span>
                              <Link
                                className="hover:bg-orange-500 hover:text-white rounded-md px-2 py-1"
                                href={PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.EDIT(id, item.id)}
                              >
                                Editar
                              </Link>
                              <ButtonDelete action={deleteCreditCardExpenseItem} id={item.id} />
                            </PopoverPanel>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <h1>No hay items </h1>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
