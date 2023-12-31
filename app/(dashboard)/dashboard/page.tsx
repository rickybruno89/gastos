import { Metadata } from 'next'
import { getToday } from '@/lib/utils'
import DashboardTemplate from './_components/dashboard-template'
import { Suspense } from 'react'
import MonthSelector from './_components/month-selector'
import LoadingSpinner from '@/components/ui/loading-spinner'

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
      <div className="flex flex-col gap-4 mb-20">
        <MonthSelector />
        <Suspense
          key={`date=${searchParams.date}`}
          fallback={
            <div className="mt-32">
              <LoadingSpinner />
            </div>
          }
        >
          <DashboardTemplate date={searchParams.date || getToday()} />
        </Suspense>
      </div>
    </main>
  )
}
