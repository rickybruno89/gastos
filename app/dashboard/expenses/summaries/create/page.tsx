import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import React from 'react'
import SummaryCreateForm from './_components/summary-create-form'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import { fetchExpenses } from '@/services/expense'

export default async function Page() {
  const expenses = await fetchExpenses()
  const paymentSources = await fetchPaymentSource()
  const paymentType = await fetchPaymentType()

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Gastos`,
            href: PAGES_URL.EXPENSES.BASE_PATH,
          },
          {
            label: 'Crear resumen',
            href: PAGES_URL.EXPENSES.SUMMARY.CREATE,
            active: true,
          },
        ]}
      />
      <h1 className="text-xl font-bold mb-2">Generar resumen</h1>
      <SummaryCreateForm paymentSources={paymentSources} paymentTypes={paymentType} expenses={expenses} />
    </main>
  )
}
