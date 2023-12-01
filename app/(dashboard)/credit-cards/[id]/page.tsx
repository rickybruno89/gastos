import Breadcrumbs from '@/components/ui/breadcrumbs'
import ButtonDelete from '@/components/ui/button-delete'
import ButtonTooltip from '@/components/ui/button-tooltip'
import LinkButton from '@/components/ui/link-button'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency, formatLocaleDate } from '@/lib/utils'
import { deleteCreditCardExpenseItem, fetchCreditCardById } from '@/services/credit-card'
import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { PlusIcon } from '@heroicons/react/24/outline'
import { EditIcon } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
}

const GenerateSummaryButton = ({ creditCardId }: { creditCardId: string }) => (
  <Link
    href={PAGES_URL.CREDIT_CARDS.SUMMARY.CREATE(creditCardId)}
    className="p-4 md:p-6 flex flex-col whitespace-nowrap w-56 h-32  rounded-md border border-dashed border-blue-400 items-center justify-center gap-1 text-blue-400 cursor-pointer"
  >
    <PlusIcon className="w-12" />
    Generar resumen
  </Link>
)

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const creditCard = await fetchCreditCardById(id)
  return (
    <main>
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
      <div className="flex flex-col gap-4">
        <section>
          <h1 className="text-xl font-bold mb-2">Detalles</h1>
          <div className="rounded-md bg-white p-4 flex flex-wrap gap-1 md:gap-4 w-fit">
            <p>
              Nombre: <span className="font-bold">{creditCard?.name}</span>{' '}
            </p>
            <p>
              Canal de pago: <span className="font-bold">{creditCard?.paymentSource.name}</span>{' '}
            </p>
            <p>
              Forma de pago: <span className="font-bold">{creditCard?.paymentType.name}</span>{' '}
            </p>
            <p>
              Impuesto de sellado: <span className="font-bold">{creditCard?.taxesPercent.toString()} %</span>{' '}
            </p>
          </div>
        </section>
        <section>
          <h1 className="text-xl font-bold mb-2">Resúmenes</h1>
          <div className="flex flex-row flex-nowrap overflow-x-auto gap-x-4">
            <GenerateSummaryButton creditCardId={id} />
            {creditCard!.paymentSummaries.map((summary) => (
              <Link
                href={PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(id, summary.id)}
                key={summary.id}
                className="rounded-md bg-white p-4 md:p-6 flex flex-col justify-center  mb-4 whitespace-nowrap w-56 h-32"
              >
                <p className="uppercase font-bold">{formatLocaleDate(summary.date)}</p>
                <p>{formatCurrency(summary.amount)} </p>
                {summary.paid ? <p className="text-green-500">PAGADO</p> : <p className="text-red-500">NO PAGADO</p>}
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="flex flex-col gap-1 w-full rounded-md bg-white p-4 md:p-6">
            <div className="flex gap-4 items-center mb-2">
              <h1 className="text-xl font-bold">Items</h1>
              <LinkButton href={PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(id)}>
                <PlusIcon className="w-5" />
                Agregar
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
                          {item.installmentsPaid}/{item.installmentsQuantity} cuotas de{' '}
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
