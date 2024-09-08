import Breadcrumbs from '@/components/ui/breadcrumbs'
import { nextAuthOptions } from '@/lib/auth'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
// import InvoicePDF from './_components/InvoicePDF' 
import MonthSelector from '../dashboard/_components/month-selector'
import { getToday } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Invoice',
}


export default async function Page() {
  const session = await getServerSession(nextAuthOptions)
  if (session?.user.email !== 'rbrunount@gmail.com') notFound()
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
      <div className="col-7">
        <h4 className="text-center">PDF Preview</h4>
        {/* <InvoicePDF data={initialValues} /> */}
      </div>
    </main>
  )
}
