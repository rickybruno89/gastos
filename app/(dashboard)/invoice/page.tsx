import Breadcrumbs from '@/components/ui/breadcrumbs'
import { nextAuthOptions } from '@/lib/auth'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { fetchInvoiceData } from '@/services/invoice'
import InvoicePDF from './_components/InvoicePDF'

export const metadata: Metadata = {
  title: 'Invoice',
}

export default async function Page() {
  const session = await getServerSession(nextAuthOptions)
  if (session?.user.email !== 'rbrunount@gmail.com') notFound()

  const data = await fetchInvoiceData()

  return (
    <main className="px-4 max-w-xl mx-auto">
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Invoice`,
            href: PAGES_URL.SETTINGS.BASE_PATH,
            active: true,
          },
        ]}
      />

      <InvoicePDF data={data} />
    </main>
  )
}
