import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency, formatLocaleDate } from '@/lib/utils'
import { fetchCreditCardSummaryById } from '@/services/summary'

export default async function Page({ params }: { params: { id: string; summaryId: string } }) {
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
            label: `Resumen ${formatLocaleDate(creditCardSummary?.date!)}`,
            href: PAGES_URL.CREDIT_CARDS.SUMMARY.DETAIL(id, summaryId),
            active: true,
          },
        ]}
      />
      {creditCardSummary ? (
        <section>
          <h1 className="text-xl font-bold mb-2">Resumen {formatLocaleDate(creditCardSummary.date!)}</h1>
          <div className="rounded-md bg-white p-4 md:p-6  mb-4 w-fit">
            {creditCardSummary.paid ? (
              <p className="text-green-500 text-lg">
                {creditCardSummary.paymentType.name} - {creditCardSummary.paymentSource.name} (PAGADO)
              </p>
            ) : (
              <p className="text-red-500 text-lg">
                {creditCardSummary.paymentType.name} - {creditCardSummary.paymentSource.name} (NO PAGADO)
              </p>
            )}
            {creditCardSummary.itemHistoryPayment.map((item) => (
              <div key={item.id} className="flex flex-wrap gap-2 justify-between">
                <span>{item.creditCardExpenseItem.description}</span>
                {!item.creditCardExpenseItem.recurrent ? (
                  <span>
                    {item.installmentsPaid} de {item.creditCardExpenseItem.installmentsQuantity}{' '}
                    {formatCurrency(item.installmentsAmount)}
                  </span>
                ) : (
                  <span>Recurrente {formatCurrency(item.installmentsAmount)}</span>
                )}
              </div>
            ))}
            <p></p>
            <p className="text-right">Total {formatCurrency(creditCardSummary.amount as number)}</p>
          </div>
        </section>
      ) : null}
    </main>
  )
}
