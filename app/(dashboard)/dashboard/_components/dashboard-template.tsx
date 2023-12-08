import { fetchPaymentSource } from '@/services/settings'
import { fetchPaymentType } from '@/services/settings'
import {
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
  fetchPaymentSourceBalance,
} from '@/services/summary'
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
  const paymentSourceBalance = await fetchPaymentSourceBalance(date)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="flex flex-col gap-3">
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
      </div>
      <div>
        <SourceBalance paymentSourceBalance={paymentSourceBalance} />
        <SharedExpenses expenseSummaries={expenseSummaries} creditCardExpenseSummaries={creditCardExpenseSummaries} />
      </div>
    </div>
  )
}
