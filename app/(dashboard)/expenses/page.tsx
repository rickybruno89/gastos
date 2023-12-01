import Breadcrumbs from '@/components/ui/breadcrumbs'
import ButtonDelete from '@/components/ui/button-delete'
import LinkButton from '@/components/ui/link-button'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency } from '@/lib/utils'
import { deleteExpenseItem, fetchExpenses } from '@/services/expense'
import { PlusIcon } from '@heroicons/react/24/outline'
import { InformationCircleIcon } from '@heroicons/react/20/solid'
import { Metadata } from 'next'
import Link from 'next/link'
import { EditIcon } from 'lucide-react'
import ButtonTooltip from '@/components/ui/button-tooltip'

export const metadata: Metadata = {
  title: 'Gastos',
}

export default async function Page() {
  const expenses = await fetchExpenses()

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Gastos`,
            href: PAGES_URL.EXPENSES.BASE_PATH,
            active: true,
          },
        ]}
      />

      <section>
        <div className="flex flex-col gap-1 w-full rounded-md bg-white p-4 md:p-6">
          <div className="flex gap-4 items-center mb-2">
            <h1 className="text-xl font-bold">Items</h1>
            <LinkButton href={PAGES_URL.EXPENSES.CREATE}>
              <PlusIcon className="w-5" />
              Agregar
            </LinkButton>
          </div>
          {expenses.length ? (
            expenses.map((item) => (
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
            ))
          ) : (
            <h1>No hay items </h1>
          )}
        </div>
      </section>
    </main>
  )
}
