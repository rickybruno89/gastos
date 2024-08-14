import { Metadata } from 'next'
import { formatLocaleDate, getToday } from '@/lib/utils'
import { lazy, Suspense } from 'react'
import MonthSelector from './_components/month-selector'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { fetchCreditCardSummariesForMonth, fetchExpenseSummariesForMonth } from '@/services/summary'
import { fetchExpenses } from '@/services/expense'

const TITLE = 'Resumen mensual'

export const metadata: Metadata = {
  title: TITLE,
}
const DashboardTemplate = lazy(() => import('./_components/dashboard-template'))

export default async function Page({
  searchParams,
}: {
  searchParams: {
    date: string
  }
}) {
  const date = searchParams.date || getToday()
  const expenseSummaries = await fetchExpenseSummariesForMonth(date)
  const creditCardExpenseSummaries = await fetchCreditCardSummariesForMonth(date)
  const expenses = await fetchExpenses()

  return (
    <main className="flex flex-col mb-20">
      <div className="px-4">
        <MonthSelector date={date} />
      </div>
      <Suspense
        key={`date=${searchParams.date}`}
        fallback={
          <div className="mt-32">
            <LoadingSpinner />
          </div>
        }
      >
        <h1 className="text-center mt-4">{TITLE + ' ' + formatLocaleDate(date)}</h1>
        <DashboardTemplate
          expenseSummaries={expenseSummaries}
          creditCardExpenseSummaries={creditCardExpenseSummaries}
          expenses={expenses}
          date={date}
        />
      </Suspense>
    </main>
  )
}
