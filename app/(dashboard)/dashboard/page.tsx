import { Metadata } from 'next'
import { formatLocaleDate, getToday } from '@/lib/utils'
import DashboardTemplate from './_components/dashboard-template'
import { Suspense } from 'react'
import MonthSelector from './_components/month-selector'
import LoadingSpinner from '@/components/ui/loading-spinner'

const TITLE = 'Resumen mensual'

export const metadata: Metadata = {
  title: TITLE,
}

export default async function Page({
  searchParams,
}: {
  searchParams: {
    date: string
  }
}) {
  const date = searchParams.date || getToday()

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
        <DashboardTemplate date={date} />
      </Suspense>
    </main>
  )
}
