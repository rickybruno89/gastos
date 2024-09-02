import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { fetchCreditCardById } from '@/services/credit-card'
import { Metadata } from 'next'
import CreditCardSummaries from '../_components/creditCardSummaries'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const creditCard = await fetchCreditCardById(id)

  return (
    <main className="">
      <div className="max-w-xl mx-auto px-4">
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
      <section>
        <CreditCardSummaries creditCard={creditCard} />
      </section>
    </main>
  )
}
