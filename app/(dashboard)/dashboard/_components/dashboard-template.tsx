import { Metadata } from 'next'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import {
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
  fetchPaymentSourceBalance,
} from '@/services/summary'
import DashboardPage from './dashboard-page'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardTemplate({ date }: { date: string }) {
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()
  const expenseSummaries = await fetchExpenseSummariesForMonth(date)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(date)
  const paymentSourceBalance = await fetchPaymentSourceBalance(date)

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
