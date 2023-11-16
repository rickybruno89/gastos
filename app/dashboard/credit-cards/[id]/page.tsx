import Breadcrumbs from '@/components/ui/breadcrumbs'
import LinkButton from '@/components/ui/link-button'
import { PAGES_URL } from '@/lib/routes'
import { fetchCreditCardWithItems } from '@/services/credit-card'
import { PlusIcon } from '@radix-ui/react-icons'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
};


export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params

  const creditCardDetails = await fetchCreditCardWithItems(id)
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: '/dashboard/credit-cards' },
          {
            label: `${creditCardDetails?.name}`,
            href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
            active: true,
          },
        ]}
      />

      <section>
        <h1 className='text-xl font-bold mb-2'>Detalles</h1>
        <div className="rounded-md bg-gray-50 p-4 md:p-6 shadow-md mb-4">
          <p>Nombre: <span className='font-bold'>{creditCardDetails?.name}</span> </p>
          <p>Canal de pago: <span className='font-bold'>{creditCardDetails?.paymentSource.name}</span> </p>
          <p>Forma de pago: <span className='font-bold'>{creditCardDetails?.paymentType.name}</span> </p>
          <p>Impuesto de sellado: <span className='font-bold'>{creditCardDetails?.taxesPercent.toString()} %</span> </p>
        </div>
      </section>
      <section>
        <div className='flex gap-4 items-center mb-2'>
          <h1 className='text-xl font-bold'>Items</h1>
          <LinkButton href={PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(id)}>
            <PlusIcon className='w-5' />
            Agregar
          </LinkButton>
        </div>
        <div className="rounded-md bg-gray-50 p-4 md:p-6  shadow-md mb-4">
          {
            creditCardDetails?.creditCardExpenseItems.length ? (
              creditCardDetails.creditCardExpenseItems.map(item => (
                <div key={item.id}>
                  <p>Nombre: <span className='font-bold'>{creditCardDetails?.name}</span> </p>
                  <p>Canal de pago: <span className='font-bold'>{creditCardDetails?.paymentSource.name}</span> </p>
                  <p>Forma de pago: <span className='font-bold'>{creditCardDetails?.paymentType.name}</span> </p>
                  <p>Impuesto de sellado: <span className='font-bold'>{creditCardDetails?.taxesPercent.toString()} %</span> </p>
                </div>)
              )) : (<h1>No hay items </h1>)
          }
        </div>
      </section>
    </main>
  )
}
