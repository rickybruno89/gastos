import ExpensesSummary, {
  CreditCardExpensesWithInclude,
  ExpensesPaymentSummaryWithInclude,
  ExpensesWithInclude,
} from './expenses-summary'

export default async function DashboardTemplate({
  expenseSummaries,
  expenses,
  creditCardExpenseSummaries,
  date,
}: {
  expenseSummaries: ExpensesPaymentSummaryWithInclude[]
  expenses: ExpensesWithInclude[]
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
  date: string
}) {
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
