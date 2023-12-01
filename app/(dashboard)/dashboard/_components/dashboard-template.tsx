import { fetchPaymentSource } from '@/services/settings'
import { fetchPaymentType } from '@/services/settings'
import { fetchCreditCardSummariesForMonth, fetchExpenseSummariesForMonth } from '@/services/summary'
import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ExpensesSummary from './expenses-summary'
import CreditCardExpensesSummary from './credit-card-expenses-summary'
import SourceBalance from './source-balance'
import SharedExpenses from './shared-expenses'
import { fetchExpenses } from '@/services/expense'

export default async function DashboardTemplate({ date }: { date: string }) {
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()
  const expenseSummaries = await fetchExpenseSummariesForMonth(date)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(date)
  const expenses = await fetchExpenses()

  return (
    <>
      <ExpensesSummary
        expenses={expenses}
        expenseSummaries={expenseSummaries}
        paymentTypes={paymentTypes}
        date={date}
        paymentSources={paymentSources}
      />
      <CreditCardExpensesSummary
        creditCardExpenseSummaries={creditCardExpenseSummaries}
        paymentTypes={paymentTypes}
        date={date}
        paymentSources={paymentSources}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <SourceBalance date={date} />
      </Suspense>
      <Suspense fallback={<LoadingSpinner />}>
        <SharedExpenses expenseSummaries={expenseSummaries} creditCardExpenseSummaries={creditCardExpenseSummaries} />
      </Suspense>
    </>
  )
}
