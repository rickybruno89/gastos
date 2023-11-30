import { Metadata } from 'next'
import { getToday } from '@/lib/utils'
import DashboardTemplate from './_components/dashboard-template'
import { Suspense } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import MonthSelector from './_components/month-selector'

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
  return (
    <main>
      <div className="flex flex-col gap-4">
        <MonthSelector />
        <Suspense key={`date=${searchParams.date}`} fallback={<LoadingSpinner />}>
          <DashboardTemplate date={searchParams.date || getToday()} />
        </Suspense>
      </div>
    </main>
  )
}
