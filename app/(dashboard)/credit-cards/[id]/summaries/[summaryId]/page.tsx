import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes'
import { formatCurrency, formatLocaleDate } from '@/lib/utils'
import { fetchCreditCardSummaryById } from '@/services/summary'

export default async function Page({ params }: { params: { id: string; summaryId: string } }) {
  const { id, summaryId } = params
  const creditCardSummary = await fetchCreditCardSummaryById(summaryId)

  return (
    <main className="px-4 max-w-xl mx-auto">
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH },
          {
            label: `${creditCardSummary?.creditCard?.name}`,
            href: PAGES_URL.CREDIT_CARDS.DETAILS(id),
          },
        ]}
      />
      {creditCardSummary ? (
        <section>
          <h1 className="text-lg font-semibold">Resumen {formatLocaleDate(creditCardSummary.date!)}</h1>

          <div className="rounded-md bg-white mb-4 w-fit flex flex-col gap-4">
            {creditCardSummary.paid ? (
              <p className="text-green-500 text-lg">PAGADO</p>
            ) : (
              <p className="text-red-500 text-lg">NO PAGADO</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {creditCardSummary.itemHistoryPayment.map((item) => (
              <div key={item.id} className="flex flex-col bg-gray-50 p-3 rounded-xl gap-2  w-full">
                <div className="w-full rounded-[10px] flex flex-col">
                  <div className="flex-1 flex justify-between items-end font-medium">
                    <span className="leading-tight uppercase text-base font-semibold">
                      {item.creditCardExpenseItem.description}
                    </span>
                    <span className='text-gray-500'>
                      {item.creditCardExpenseItem.recurrent
                        ? 'Pago recurrente'
                        : `Cuota ${item.installmentsPaid} de ${item.installmentsQuantity} de`}
                    </span>
                  </div>
                  <div className="flex-1 flex justify-end items-end">
                    <span className="font-semibold">{formatCurrency(item.installmentsAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex bg-slate-700 p-3 rounded-xl gap-2 w-full text-white justify-end">
              <div className="flex flex-col justify-between items-end font-medium ">
                <span className="text-right">Impuestos, sellos, etc:</span>
                <span className="text-right">Total:</span>
              </div>
              <div className="flex  flex-col justify-between items-end font-medium ">
                <span className="font-semibold"> {formatCurrency(creditCardSummary.taxes)}</span>
                <span className="font-semibold"> {formatCurrency(creditCardSummary.amount)}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
