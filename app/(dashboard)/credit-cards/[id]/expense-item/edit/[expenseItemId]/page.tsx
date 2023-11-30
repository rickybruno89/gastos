import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { fetchCreditCardExpenseItem, fetchCreditCardName } from '@/services/credit-card'
import { Metadata } from 'next'
import React from 'react'
import { fetchPersonToShare } from '@/services/settings/person-to-share-expense'
import { fetchCurrency } from '@/services/settings/currency'
import UpsertCreditCardExpenseItemForm from '../../_components/upsert-form'

export const metadata: Metadata = {
  title: 'Nuevo Item',
}

export default async function Page({ params }: { params: { id: string; expenseItemId: string } }) {
  const { id, expenseItemId } = params

  const creditCard = await fetchCreditCardName(id)
  const creditCardExpenseItem = await fetchCreditCardExpenseItem(expenseItemId)
  const personsToShare = await fetchPersonToShare()
  const currencies = await fetchCurrency()

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: '/dashboard/credit-cards' },
          {
            label: creditCard?.name || '',
            href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
          },
          {
            label: `Editar Item`,
            href: PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.EDIT(id, expenseItemId),
            active: true,
          },
        ]}
      />
      <UpsertCreditCardExpenseItemForm
        creditCardId={id}
        creditCardExpenseItem={creditCardExpenseItem!}
        personsToShare={personsToShare}
        currencies={currencies}
      />
    </main>
  )
}
