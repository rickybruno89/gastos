import { Metadata } from 'next'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import DashboardPage from './_components/dashboard-page'
import { fetchCreditCardSummariesForMonth, fetchExpenseSummariesForMonth } from '@/services/summary'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function Page({
  searchParams,
}: {
  searchParams: {
    date: string
  }
}) {
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()
  const expenseSummaries = await fetchExpenseSummariesForMonth(searchParams.date)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(searchParams.date)

  return (
    <main>
      <DashboardPage
        expenseSummaries={expenseSummaries}
        creditCardExpenseSummaries={creditCardExpenseSummaries}
        paymentSources={paymentSources}
        paymentTypes={paymentTypes}
      />
    </main>
  )
}
