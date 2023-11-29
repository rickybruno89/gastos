import { Metadata } from 'next'
import { getToday } from '@/lib/utils'
import DashboardTemplate from './_components/dashboard-template'
import { Suspense } from 'react'
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
    <Suspense key={`date=${searchParams.date}`} fallback={<LoadingSpinner />}>
      <main>
        <div className="flex flex-col gap-4">
          <DashboardTemplate date={searchParams.date || getToday()} />
        </div>
      </main>
    </Suspense>
  )
}
