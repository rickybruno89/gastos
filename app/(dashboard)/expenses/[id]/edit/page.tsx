import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import React from 'react'
import { fetchPersonToShare } from '@/services/settings'
import { fetchPaymentSource } from '@/services/settings'
import { fetchPaymentType } from '@/services/settings'
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
    <main className='px-4 max-w-xl mx-auto'>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Gastos`,
            href: PAGES_URL.EXPENSES.BASE_PATH,
            active: false,
          },
          {
            label: `Editar gasto`,
            href: PAGES_URL.EXPENSES.EDIT(id),
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
