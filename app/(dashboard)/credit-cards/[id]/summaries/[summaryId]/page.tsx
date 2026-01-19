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
                    <div className="flex items-center gap-2">
                      <span className="leading-tight uppercase text-base font-semibold">
                        {item.creditCardExpenseItem.description}
                      </span>
                      {item.creditCardExpenseItem.currency === 'USD' && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase font-semibold">
                          USD
                        </span>
                      )}
                    </div>
                    <span className='text-gray-500'>
                      {item.creditCardExpenseItem.recurrent
                        ? 'Pago recurrente'
                        : `Cuota ${item.installmentsPaid} de ${item.installmentsQuantity}`}
                    </span>
                  </div>
                  <div className="flex-1 flex justify-end items-end">
                    <span className="font-semibold">{formatCurrency(item.installmentsAmount)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex bg-slate-700 p-3 rounded-xl gap-2 w-full text-white justify-end flex-col">
              {/* Mostrar totales por moneda si existen */}
              {creditCardSummary.totalAmountARS || creditCardSummary.totalAmountUSD ? (
                <>
                  {creditCardSummary.totalAmountARS && creditCardSummary.totalAmountARS > 0 ? (
                    <div className="flex justify-between items-center border-b border-white/20 pb-2">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm flex items-center gap-2">
                          <span className="text-xs bg-green-600 px-2 py-0.5 rounded">ARS</span>
                          Impuestos:
                        </span>
                        {creditCardSummary.creditBalanceARS && creditCardSummary.creditBalanceARS > 0 ? (
                          <span className="text-sm flex items-center gap-2">
                            <span className="text-xs bg-green-600 px-2 py-0.5 rounded">ARS</span>
                            Saldo a favor:
                          </span>
                        ) : null}
                        <span className="text-sm flex items-center gap-2">
                          <span className="text-xs bg-green-600 px-2 py-0.5 rounded">ARS</span>
                          Total:
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold">{formatCurrency(creditCardSummary.taxesARS || 0)}</span>
                        {creditCardSummary.creditBalanceARS && creditCardSummary.creditBalanceARS > 0 ? (
                          <span className="font-semibold text-green-400">-{formatCurrency(creditCardSummary.creditBalanceARS)}</span>
                        ) : null}
                        <span className="font-semibold text-lg">{formatCurrency(creditCardSummary.totalAmountARS)}</span>
                      </div>
                    </div>
                  ) : null}
                  {creditCardSummary.totalAmountUSD && creditCardSummary.totalAmountUSD > 0 ? (
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm flex items-center gap-2">
                          <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">USD</span>
                          Impuestos:
                        </span>
                        {creditCardSummary.creditBalanceUSD && creditCardSummary.creditBalanceUSD > 0 ? (
                          <span className="text-sm flex items-center gap-2">
                            <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">USD</span>
                            Saldo a favor:
                          </span>
                        ) : null}
                        <span className="text-sm flex items-center gap-2">
                          <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">USD</span>
                          Total:
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold">{formatCurrency(creditCardSummary.taxesUSD || 0)}</span>
                        {creditCardSummary.creditBalanceUSD && creditCardSummary.creditBalanceUSD > 0 ? (
                          <span className="font-semibold text-green-400">-{formatCurrency(creditCardSummary.creditBalanceUSD)}</span>
                        ) : null}
                        <span className="font-semibold text-lg">{formatCurrency(creditCardSummary.totalAmountUSD)}</span>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                /* Mostrar total único si no hay separación por moneda */
                <div className="flex justify-between items-center">
                  <div className="flex flex-col items-end">
                    <span className="text-right">Impuestos, sellos, etc:</span>
                    <span className="text-right">Total:</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">{formatCurrency(creditCardSummary.taxes)}</span>
                    <span className="font-semibold text-lg">{formatCurrency(creditCardSummary.amount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}
