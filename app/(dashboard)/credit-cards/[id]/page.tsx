import Breadcrumbs from '@/components/ui/breadcrumbs'
import ButtonDelete from '@/components/ui/button-delete'
import ButtonTooltip from '@/components/ui/button-tooltip'
import LinkButton from '@/components/ui/link-button'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency, formatLocaleDate, formatLocaleDueDate } from '@/lib/utils'
import { deleteCreditCardExpenseItem, fetchCreditCardById } from '@/services/credit-card'
import { deleteCreditCardPaymentSummary } from '@/services/summary'
import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Edit, EditIcon, EyeIcon } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
}

const GenerateSummaryButton = ({ creditCardId }: { creditCardId: string }) => (
  <Link
    href={PAGES_URL.CREDIT_CARDS.SUMMARY.CREATE(creditCardId)}
    className="p-4 md:p-6 flex flex-col whitespace-nowrap w-40 h-32  rounded-md border border-dashed border-blue-400 items-center justify-center gap-1 text-blue-400 cursor-pointer"
  >
    <PlusIcon className="w-12" />
    Generar resumen
  </Link>
)

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
            <LinkButton href={PAGES_URL.CREDIT_CARDS.SUMMARY.CREATE(id)}>
              <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
                <PlusIcon className="w-5 " />
                <span className="">Nuevo</span>
              </div>
            </LinkButton>
          </div>
          <div className="px-4 max-w-xl md:overflow-x-visible md:flex-wrap md:mx-auto flex gap-2 justify-start flex-nowrap overflow-x-auto no-scrollbar">
            {creditCard!.paymentSummaries.map((summary, index) => (
              <div className="cursor-pointer shadow-lg px-4 py-2 shrink-0 flex flex-col w-52 justify-around rounded-xl bg-gradient-to-r from-gray-500 to-gray-900 text-white leading-tight">
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
              <LinkButton href={PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(id)}>
                <div className="hover:bg-gray-600 flex px-2 py-1 rounded-md hover:text-white text-orange-500">
                  <PlusIcon className="w-5 " />
                  <span className="">Agregar</span>
                </div>
              </LinkButton>
            </div>
            {creditCard?.creditCardExpenseItems.length ? (
              creditCard.creditCardExpenseItems.map((item) => (
                <div key={item.id} className="flex flex-col">
                  <div className="flex flex-col xl:grid lg:grid-cols-9 ">
                    <p className="self-center col-span-2 font-bold">{item.description}</p>
                    <p className="self-center">
                      {item.recurrent ? formatCurrency(item.installmentsAmount) : formatCurrency(item.amount)}
                    </p>
                    <div className="self-center col-span-2">
                      {item.recurrent ? (
                        <p>Pago recurrente</p>
                      ) : (
                        <p>
                          Cuota {item.installmentsPaid} de {item.installmentsQuantity} de{' '}
                          {formatCurrency(item.installmentsAmount)}
                        </p>
                      )}
                    </div>
                    <p className="self-center">{formatLocaleDate(item.paymentBeginning)}</p>
                    <div className="self-center col-span-2">
                      {item.sharedWith.length ? (
                        <p>
                          Compartido con{' '}
                          <span className="">{item.sharedWith.map((person) => person.name).join(' - ')}</span>
                        </p>
                      ) : (
                        <p className="self-center">No compartido</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 justify-self-end self-center">
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
                        content="Editar item"
                        trigger={
                          <Link href={PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.EDIT(id, item.id)}>
                            <EditIcon className="w-5 h-5" />
                          </Link>
                        }
                      />
                      <ButtonDelete action={deleteCreditCardExpenseItem} id={item.id} />
                    </div>
                  </div>
                  <div className="my-2 h-px w-full bg-gray-300" />
                </div>
              ))
            ) : (
              <h1>No hay items </h1>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
