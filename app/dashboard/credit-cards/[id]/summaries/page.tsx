"use server"
import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes';
import { fetchCreditCardById } from '@/services/credit-card';
import React from 'react'

export default async function Page({ params }: { params: { id: string } }) {
  const creditCardId = params.id
  const creditCard = await fetchCreditCardById(creditCardId)

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: `${creditCard?.name}`,
            href: PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId),
          },
          {
            label: 'Resúmenes',
            href: PAGES_URL.CREDIT_CARDS.SUMMARY.BASE_PATH(creditCardId),
            active: true,
          },
        ]}
      />
    </main>
  )
}
