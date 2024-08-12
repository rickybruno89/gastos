import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import React from 'react'
import UpsertExpenseForm from '../_components/upsert-form'
import { fetchPersonToShare } from '@/services/settings'

export const metadata: Metadata = {
  title: 'Nuevo Item',
}

export default async function Page() {
  const personsToShare = await fetchPersonToShare()

  return (
    <main className="px-4 max-w-xl mx-auto">
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
      <UpsertExpenseForm personsToShare={personsToShare} />
    </main>
  )
}
