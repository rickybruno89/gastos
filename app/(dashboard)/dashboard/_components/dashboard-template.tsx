import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import {
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
  fetchPaymentSourceBalance,
} from '@/services/summary'
import DashboardPage from './shared-expenses'
import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import ExpensesSummary from './expenses-summary'
import CreditCardExpensesSummary from './credit-card-expenses-summary'
import SourceBalance from './source-balance'
import SharedExpenses from './shared-expenses'
import { ExpensesSkeleton } from './skeletons/expenses-skeleton'

export default async function DashboardTemplate({ date }: { date: string }) {
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()
  const expenseSummaries = await fetchExpenseSummariesForMonth(date)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(date)

  return (
    <div className="flex flex-col gap-4">
      <Suspense key={`date=${date}`} fallback={<ExpensesSkeleton />}>
        <ExpensesSummary
          expenseSummaries={expenseSummaries}
          paymentTypes={paymentTypes}
          date={date}
          paymentSources={paymentSources}
        />
      </Suspense>
      <Suspense key={`date=${date}`} fallback={<LoadingSpinner />}>
        <CreditCardExpensesSummary
          creditCardExpenseSummaries={creditCardExpenseSummaries}
          paymentTypes={paymentTypes}
          date={date}
          paymentSources={paymentSources}
        />
      </Suspense>
      <Suspense key={`date=${date}`} fallback={<LoadingSpinner />}>
        <SourceBalance date={date} />
      </Suspense>
      <Suspense key={`date=${date}`} fallback={<LoadingSpinner />}>
        <SharedExpenses expenseSummaries={expenseSummaries} creditCardExpenseSummaries={creditCardExpenseSummaries} />
      </Suspense>
    </div>
  )
}
