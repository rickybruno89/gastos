import { Metadata } from 'next'
import Breadcrumbs from '@/components/ui/breadcrumbs'
import { fetchPaymentSource } from '@/services/settings'
import { fetchPaymentType } from '@/services/settings'
import { PAGES_URL } from '@/lib/routes'
import CreditCardCreateUpsertForm from '../../_components/upsert-form'
import { fetchCreditCardById } from '@/services/credit-card'

export const metadata: Metadata = {
  title: 'Editar Tarjeta de Crédito',
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const creditCard = await fetchCreditCardById(id)
  const paymentSources = await fetchPaymentSource()
  const paymentType = await fetchPaymentType()
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: 'Editar Tarjeta de crédito',
            href: PAGES_URL.CREDIT_CARDS.EDIT(id),
            active: true,
          },
        ]}
      />
      <CreditCardCreateUpsertForm creditCard={creditCard!} paymentSources={paymentSources} paymentTypes={paymentType} />
    </main>
  )
}
