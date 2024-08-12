import {
  fetchCreditCardSummariesForMonth,
  fetchExpenseSummariesForMonth,
} from '@/services/summary'
import ExpensesSummary from './expenses-summary'
import { fetchExpenses } from '@/services/expense'

export default async function DashboardTemplate({ date }: { date: string }) {
  const expenseSummaries = await fetchExpenseSummariesForMonth(date)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(date)
  const expenses = await fetchExpenses()

  return (
    <div>
      <ExpensesSummary
        expenses={expenses}
        expenseSummaries={expenseSummaries}
        creditCardExpenseSummaries={creditCardExpenseSummaries}
        date={date}
      />
    </div>
  )
}
