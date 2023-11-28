import { Metadata } from 'next'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import DashboardPage from './_components/dashboard-page'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function Page() {
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()

  return (
    <main>
      <DashboardPage paymentSources={paymentSources} paymentTypes={paymentTypes} />
    </main>
  )
}
