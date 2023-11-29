import { Metadata } from 'next'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import DashboardPage from './_components/dashboard-page'
import {
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
  fetchPaymentSourceBalance,
} from '@/services/summary'
import { getToday } from '@/lib/utils'

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
  const now = searchParams.date || getToday()
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()
  const expenseSummaries = await fetchExpenseSummariesForMonth(now)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(now)
  const paymentSourceBalance = await fetchPaymentSourceBalance(now)

  return (
    <main>
      <DashboardPage
        expenseSummaries={expenseSummaries}
        creditCardExpenseSummaries={creditCardExpenseSummaries}
        paymentSources={paymentSources}
        paymentTypes={paymentTypes}
        paymentSourceBalance={paymentSourceBalance}
      />
    </main>
  )
}
