import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency } from '@/lib/utils'
import { fetchCreditCards } from '@/services/credit-card'
import { PlusIcon } from '@heroicons/react/20/solid'
import { CreditCardExpenseItem } from '@prisma/client'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
}

export default async function Page() {
  const creditCards = await fetchCreditCards()
  const getItemsTotalAmount = (creditCardExpenseItems: CreditCardExpenseItem[]): number =>
    creditCardExpenseItems.reduce((sum, creditCardExpenseItem) => (sum += creditCardExpenseItem.installmentsAmount), 0)

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[{ label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH, active: true }]}
      />
      <div className="flex gap-4 flex-wrap justify-center md:justify-start">
        {creditCards.map((creditCard) => (
          <Link
            className="bg-red-700 w-full md:w-[350px] aspect-video rounded-md shadow-xl p-4 text-white flex flex-col justify-between"
            href={PAGES_URL.CREDIT_CARDS.DETAILS(creditCard.id)}
            key={creditCard.id}
          >
            <h1 className="font-bold">{creditCard.name}</h1>
            <div className="flex flex-1 flex-col gap-2 justify-end">
              <p>Total de movimientos</p>
              <span className="font-bold">
                {formatCurrency(getItemsTotalAmount(creditCard.creditCardExpenseItems))}
              </span>
            </div>
          </Link>
        ))}
        <Link
          href={PAGES_URL.CREDIT_CARDS.CREATE}
          className="w-full md:w-[350px] aspect-video rounded-md border border-dashed border-blue-400 flex justify-center items-center gap-4 text-blue-400 cursor-pointer"
        >
          <PlusIcon className="w-12 " />
          Agregar tarjeta
        </Link>
      </div>
    </main>
  )
}
