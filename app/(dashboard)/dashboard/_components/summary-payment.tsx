'use client'
import { Button } from '@/components/ui/button'
import { removeCurrencyMaskFromInput } from '@/lib/utils'
import { PaymentSource, PaymentType, Prisma } from '@prisma/client'
import Link from 'next/link'
import React, { useState } from 'react'
import { useFormState } from 'react-dom'
import { NumericFormat } from 'react-number-format'
import { Calendar } from '@/components/ui/calendar'

type ExpensesWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    paymentSource: true
    paymentType: true
    sharedWith: true
  }
}>

export default function SummaryPaymentForm({
  expenses,
  paymentTypes,
  paymentSources,
}: {
  expenses: ExpensesWithInclude[]
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
}) {
  const [selectedItems, setSelectedItems] = useState(expenses.map((item) => ({ ...item, checked: true })))
  const handleItemAmountChange = (inputAmount: string, id: string) => {
    const amount = removeCurrencyMaskFromInput(inputAmount)
    const newSelectedItems = selectedItems.map((item) => {
      if (item.id === id) {
        return { ...item, amount }
      }
      return item
    })
    setSelectedItems(newSelectedItems)
  }

  const handleItemChangePaymentType = (paymentTypeId: string, id: string) => {
    const newSelectedItems = selectedItems.map((item) => {
      if (item.id === id) {
        return { ...item, paymentTypeId }
      }
      return item
    })
    setSelectedItems(newSelectedItems)
  }
  const handleItemChangePaymentSource = (paymentSourceId: string, id: string) => {
    const newSelectedItems = selectedItems.map((item) => {
      if (item.id === id) {
        return { ...item, paymentSourceId }
      }
      return item
    })
    setSelectedItems(newSelectedItems)
  }

  return (
    <>
      <div>
        <Calendar mode="single" selected={new Date()} onSelect={(e) => console.log(e)} className="rounded-md border" />
      </div>
      <form>
        <div className="rounded-md bg-gray-50 p-4 md:p-6 w-full md:w-fit flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <p className="mb-2 block text-sm font-medium">Seleccione los items a pagar</p>
            {expenses.map((expense) => (
              <div key={expense.id} className="flex flex-wrap items-center justify-between gap-4">
                <p className="font-bold w-full md:w-fit">{expense.description}</p>
                <div>
                  <div>
                    <select
                      className="rounded-md text-sm w-full md:w-fit"
                      aria-describedby="paymentTypeId"
                      defaultValue={expense.paymentTypeId}
                      onChange={(e) => handleItemChangePaymentType(e.target.value, expense.id)}
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
                      defaultValue={expense.paymentSourceId}
                      onChange={(e) => handleItemChangePaymentSource(e.target.value, expense.id)}
                    >
                      {paymentSources.map((paymentSource) => (
                        <option key={paymentSource.id} value={paymentSource.id}>
                          {paymentSource.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end items-center gap-2">
                  <NumericFormat
                    className="rounded-md text-sm w-full md:w-28"
                    value={expense.amount}
                    onChange={(e) => handleItemAmountChange(e.target.value, expense.id)}
                    prefix={'$ '}
                    thousandSeparator="."
                    decimalScale={2}
                    decimalSeparator=","
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </>
  )
}
