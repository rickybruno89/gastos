import { fetchPaymentSource } from '@/services/settings'
import { fetchPaymentType } from '@/services/settings'
import {
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
  fetchPaymentSourceBalance,
} from '@/services/summary'
import ExpensesSummary from './expenses-summary'
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
    <div>
      <ExpensesSummary
        expenses={expenses}
        expenseSummaries={expenseSummaries}
        creditCardExpenseSummaries={creditCardExpenseSummaries}
        date={date}
      />
      {/* <SourceBalance paymentSourceBalance={paymentSourceBalance} /> */}
     
    </div>
  )
}
