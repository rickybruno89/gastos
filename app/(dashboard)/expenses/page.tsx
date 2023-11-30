import Breadcrumbs from '@/components/ui/breadcrumbs'
import ButtonDelete from '@/components/ui/button-delete'
import LinkButton from '@/components/ui/link-button'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency } from '@/lib/utils'
import { deleteExpenseItem, fetchExpenses } from '@/services/expense'
import { InformationCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Metadata } from 'next'
import Link from 'next/link'
import { EditIcon } from 'lucide-react'

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
                <div className="flex flex-wrap md:grid lg:grid-cols-8 gap-2">
                  <p className="self-center col-span-2">{item.description}</p>
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
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger>
                          <InformationCircleIcon className="w-6 h-6 text-blue-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div>
                            Notas:{' '}
                            {item.notes ? (
                              <span className="">{item.notes}</span>
                            ) : (
                              <span className="italic">No hay notas</span>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Link href={PAGES_URL.EXPENSES.EDIT(item.id)}>
                            <EditIcon className="w-5 h-5" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Editar item</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <ButtonDelete action={deleteExpenseItem} id={item.id} />
                  </div>
                </div>
                <div className="h-px w-full bg-gray-300" />
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
