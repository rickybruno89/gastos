import Breadcrumbs from '@/components/ui/breadcrumbs'
import LinkButton from '@/components/ui/link-button'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency, formatLocaleDate } from '@/lib/utils'
import { fetchCreditCardById, fetchCreditCardExpenseItem, } from '@/services/credit-card'
import { PlusIcon } from '@radix-ui/react-icons'
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
};

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params
  const creditCard = await fetchCreditCardById(id)
  const creditCardDetails = await fetchCreditCardExpenseItem(id)

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: `${creditCard?.name}`,
            href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
            active: true,
          },
        ]}
      />

      <section>
        <h1 className='text-xl font-bold mb-2'>Detalles</h1>
        <div className="rounded-md bg-gray-50 p-4 md:p-6 shadow-md mb-4">
          <p>Nombre: <span className='font-bold'>{creditCard?.name}</span> </p>
          <p>Canal de pago: <span className='font-bold'>{creditCard?.paymentSource.name}</span> </p>
          <p>Forma de pago: <span className='font-bold'>{creditCard?.paymentType.name}</span> </p>
          <p>Impuesto de sellado: <span className='font-bold'>{creditCard?.taxesPercent.toString()} %</span> </p>
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
        <div className='flex flex-col gap-4'>
          {
            creditCardDetails.length ? (
              creditCardDetails.map(item => (
                <div key={item.id} className="relative rounded-md bg-gray-50 shadow-md">
                  {
                    !item.finished ? (<span className="absolute flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 top-1 left-1"></span>
                    </span>) : null
                  }
                  <div className='p-4 md:p-6'>
                    {
                      item.finished ? (<span className='font-bold text-red-600'>{item.description} - Pago finalizado</span>) : (<span className='font-bold'>{item.description}</span>)
                    }
                    {
                      item.recurrent ? <p className='font-bold'>Pago recurrente</p> : (
                        <>
                          <p>Financiación: <span className='font-bold'>{item.installmentsQuantity} cuotas de {formatCurrency(item.installmentsAmount)}</span> </p>
                          <p>Cuotas pagadas <span className='font-bold'>{item.installmentsPaid} de {item.installmentsQuantity}</span> </p>
                        </>
                      )
                    }
                    <p>Monto total: <span className='font-bold'>{formatCurrency(item.amount)}</span> </p>
                    <p>Primer pago <span className='font-bold'>{formatLocaleDate(item.paymentBeginning)}</span> </p>
                    {
                      item.sharedWith.length ? (<p>Gasto compartido con <span className='font-bold'>{item.sharedWith.map(person => person.name).join(" - ")}</span> </p>) : null
                    }
                  </div>
                </div>)
              )) : (<h1>No hay items </h1>)
          }
        </div>

      </section>
    </main>
  )
}
