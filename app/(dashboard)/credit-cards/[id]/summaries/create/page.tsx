import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { fetchCreditCardById } from '@/services/credit-card'
import React from 'react'
import SummaryCreateForm from './_components/summary-create-form'

export default async function Page({ params }: { params: { id: string } }) {
  const creditCardId = params.id
  const creditCard = await fetchCreditCardById(creditCardId)

  return (
    <main className='px-4 max-w-xl mx-auto'>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: `${creditCard?.name}`,
            href: PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId),
          },
          {
            label: 'Crear resumen',
            href: PAGES_URL.CREDIT_CARDS.SUMMARY.CREATE(creditCardId),
            active: true,
          },
        ]}
      />
      <h1 className="text-xl font-bold mb-2">Generar resumen </h1>
      <SummaryCreateForm creditCard={creditCard!} />
    </main>
  )
}
