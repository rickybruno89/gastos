import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import PaymentTypeWrapper from './_components/payment-type/payment-type-wrapper'
import PaymentSourceWrapper from './_components/payment-source/payment-source-wrapper'
import PersonToShareWrapper from './_components/person-to-share/person-to-share-wrapper'
import { Suspense } from 'react'
import SkeletonLoadingSettings from './_components/skeleton-loading'
import MailerTest from './_components/mailer-test'

export const metadata: Metadata = {
  title: 'Configuración',
}

export default async function Page() {
  return (
    <main className="flex gap-4 flex-wrap flex-col">
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Configuración`,
            href: PAGES_URL.SETTINGS.BASE_PATH,
            active: true,
          },
        ]}
      />
      <MailerTest />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Suspense fallback={<SkeletonLoadingSettings />}>
          <PaymentTypeWrapper />
        </Suspense>
        <Suspense fallback={<SkeletonLoadingSettings />}>
          <PaymentSourceWrapper />
        </Suspense>
        <Suspense fallback={<SkeletonLoadingSettings />}>
          <PersonToShareWrapper />
        </Suspense>
      </div>
    </main>
  )
}
