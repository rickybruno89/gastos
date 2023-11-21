import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes';
import { fetchCreditCardName } from '@/services/credit-card';
import { Metadata } from 'next';
import React from 'react'
import CreditCardExpenseItemCreateForm from './_components/create-form';
import { fetchPersonToShare } from '@/services/settings/person-to-share-expense';
import { fetchCurrency } from '@/services/settings/currency';

export const metadata: Metadata = {
  title: 'Nuevo Item',
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params

  const creditCard = await fetchCreditCardName(id)
  const personsToShare = await fetchPersonToShare()
  const currencies = await fetchCurrency()


  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: '/dashboard/credit-cards' },
          {
            label: creditCard?.name || "",
            href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
          },
          {
            label: `Nuevo Item`,
            href: PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(id),
            active: true,
          },
        ]}
      />
      <CreditCardExpenseItemCreateForm creditCardId={id} personsToShare={personsToShare} currencies={currencies} />
    </main>
  )
}
