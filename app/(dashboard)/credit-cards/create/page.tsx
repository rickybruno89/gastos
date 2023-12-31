import { Metadata } from 'next'
import Breadcrumbs from '@/components/ui/breadcrumbs'
import { fetchPaymentSource } from '@/services/settings'
import { fetchPaymentType } from '@/services/settings'
import { PAGES_URL } from '@/lib/routes'
import CreditCardCreateUpsertForm from '../_components/upsert-form'

export const metadata: Metadata = {
  title: 'Crear Tarjeta de Crédito',
}
export default async function Page() {
  const paymentSources = await fetchPaymentSource()
  const paymentType = await fetchPaymentType()
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: 'Crear tarjeta de crédito',
            href: PAGES_URL.CREDIT_CARDS.CREATE,
            active: true,
          },
        ]}
      />
      <CreditCardCreateUpsertForm paymentSources={paymentSources} paymentTypes={paymentType} />
    </main>
  )
}
