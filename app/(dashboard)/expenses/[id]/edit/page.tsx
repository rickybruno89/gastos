import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import React from 'react'
import { fetchPersonToShare } from '@/services/settings/person-to-share-expense'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import UpsertExpenseForm from '../../_components/upsert-form'
import { fetchExpenseItem } from '@/services/expense'

export const metadata: Metadata = {
  title: 'Editar Item',
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const expenseItem = await fetchExpenseItem(id)
  const personsToShare = await fetchPersonToShare()
  const paymentSources = await fetchPaymentSource()
  const paymentType = await fetchPaymentType()

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Gastos`,
            href: PAGES_URL.EXPENSES.BASE_PATH,
            active: false,
          },
          {
            label: `Nuevo gasto`,
            href: PAGES_URL.EXPENSES.CREATE,
            active: true,
          },
        ]}
      />
      <UpsertExpenseForm
        expenseItem={expenseItem!}
        personsToShare={personsToShare}
        paymentSources={paymentSources}
        paymentTypes={paymentType}
      />
    </main>
  )
}
