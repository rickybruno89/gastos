import { Metadata } from 'next'
import CreateSummaryForm from './_components/summary-payment'
import { getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import { fetchSummariesForMonth } from '@/services/summary'
import { fetchPaymentSource } from '@/services/settings/payment-source'
import { fetchPaymentType } from '@/services/settings/payment-type'
import { useState } from 'react'
import SummaryPaymentForm from './_components/summary-payment'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function Page() {
  const summaries = await fetchSummariesForMonth(new Date().toUTCString())
  const paymentSources = await fetchPaymentSource()
  const paymentTypes = await fetchPaymentType()

  return (
    <main>
      {/* <SummaryPaymentForm expenses={summaries} paymentSources={paymentSources} paymentTypes={paymentTypes} /> */}
      {/* <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<LatestInvoicesSkeleton />}>

          <LatestInvoices />
        </Suspense>
      </div> */}
    </main>
  )
}
