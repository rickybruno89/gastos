'use client'
import { Button } from '@/components/ui/button'
import { formatCurrency, removeCurrencyMaskFromInput } from '@/lib/utils'
import {
  setCreditCardPaymentSummaryPaid,
  updateAmountCreditCardPaymentSummary,
  updatePaymentTypeCreditCardPaymentSummary,
  updatePaymentSourceCreditCardPaymentSummary,
} from '@/services/summary'
import { CreditCardPaymentSummary, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import React from 'react'
import { NumericFormat } from 'react-number-format'
import { debounce } from 'lodash'

type CreditCardExpensesWithInclude = Prisma.CreditCardPaymentSummaryGetPayload<{
  include: {
    creditCard: true
    paymentSource: true
    paymentType: true
    itemHistoryPayment: {
      include: {
        creditCardExpenseItem: {
          include: {
            sharedWith: true
          }
        }
      }
    }
  }
}>

export default function CreditCardExpensesSummary({
  paymentTypes,
  paymentSources,
  creditCardExpenseSummaries,
  date,
}: {
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
  creditCardExpenseSummaries: CreditCardExpensesWithInclude[]
  date: string
}) {
  const handleCreditCardAmountChange = debounce(
    (creditCardExpenseSummary: CreditCardPaymentSummary, inputAmount: string) => {
      const amount = removeCurrencyMaskFromInput(inputAmount)
      updateAmountCreditCardPaymentSummary(creditCardExpenseSummary, amount, date)
    },
    1000
  )

  const handleCreditCardChangePaymentType = (
    creditCardExpenseSummary: CreditCardPaymentSummary,
    paymentTypeId: string
  ) => {
    updatePaymentTypeCreditCardPaymentSummary(creditCardExpenseSummary, paymentTypeId, date)
  }
  const handleCreditCardChangePaymentSource = (
    creditCardExpenseSummary: CreditCardPaymentSummary,
    paymentSourceId: string
  ) => {
    updatePaymentSourceCreditCardPaymentSummary(creditCardExpenseSummary, paymentSourceId, date)
  }

  const payCreditCardExpense = (item: CreditCardExpensesWithInclude) => {
    setCreditCardPaymentSummaryPaid(item)
  }

  return (
    <>
      <p className="font-bold">Tarjetas de Crédito</p>
      {creditCardExpenseSummaries?.length ? (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {creditCardExpenseSummaries.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{item.creditCard.name}</p>
                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentTypeId"
                      value={item.paymentTypeId}
                      onChange={(e) => handleCreditCardChangePaymentType(item, e.target.value)}
                    >
                      {paymentTypes.map((paymentType) => (
                        <option key={paymentType.id} value={paymentType.id}>
                          {paymentType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentSourceId"
                      value={item.paymentSourceId}
                      onChange={(e) => handleCreditCardChangePaymentSource(item, e.target.value)}
                    >
                      {paymentSources.map((paymentSource) => (
                        <option key={paymentSource.id} value={paymentSource.id}>
                          {paymentSource.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {item.paid ? (
                  <>
                    <div className="flex justify-end items-center gap-4">
                      <span className="text-sm">{formatCurrency(item.amount)}</span>
                      <span className="text-green-500">PAGADO</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-end items-center gap-2">
                      <NumericFormat
                        className="rounded-md text-sm w-full md:w-28"
                        value={item.amount}
                        onChange={(e) => handleCreditCardAmountChange(item, e.target.value)}
                        prefix={'$ '}
                        thousandSeparator="."
                        decimalScale={2}
                        decimalSeparator=","
                      />
                    </div>
                    <Button size={'sm'} onClick={() => payCreditCardExpense(item)}>
                      Pagar
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col gap-4">
          <h1>No se encontro ningun resumen de tarjetas.</h1>
          <h1>Navegar a la pagina de &quot;Tarjetas de Crédito&quot; para generar los resumenes mensuales</h1>
        </section>
      )}
    </>
  )
}