"use server"
import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes';
import { formatLocaleDate } from '@/lib/utils';
import { fetchCreditCardSummaryById } from '@/services/summary';
import React from 'react'

export default async function Page({ params }: { params: { id: string, summaryId: string } }) {
  const { id, summaryId } = params
  const creditCardSummary = await fetchCreditCardSummaryById(summaryId)

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: `${creditCardSummary?.creditCard?.name}`,
            href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
          },
          {
            label: 'Resúmenes',
            href: PAGES_URL.CREDIT_CARDS.SUMMARY.BASE_PATH(id),
          },
          {
            label: `${formatLocaleDate(creditCardSummary?.date!)}`,
            href: PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(id, summaryId),
            active: true,
          },
        ]}
      />
      <section>
        <h1 className='text-xl font-bold mb-2'>Resumen {formatLocaleDate(creditCardSummary?.date!)}</h1>
        <div className="rounded-md bg-white p-4 md:p-6  mb-4 w-fit">
          {
            creditCardSummary?.creditCardExpenseItems.map(item => (
              <div key={item.id}>
                <span>{item.description}</span>
                {
                  !item.recurrent ? (
                    <span>Cuota pagada {item.installmentsPaid}</span>

                  ) : null
                }
              </div>
            ))
          }

        </div>
      </section>

    </main>
  )
}
