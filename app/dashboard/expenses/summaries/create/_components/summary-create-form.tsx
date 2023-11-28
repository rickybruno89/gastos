'use client'
import { Button } from '@/components/ui/button'
import { PAGES_URL } from '@/lib/routes'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { createSummaryForMonth } from '@/services/summary'
import { Expense, PaymentSource, PaymentType, Prisma } from '@prisma/client'
import { formatCurrency, getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import { FormEvent, useEffect, useState } from 'react'
import { NumericFormat } from 'react-number-format'

type ExpensesWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    paymentSource: true
    paymentType: true
    sharedWith: true
  }
}>

export default function SummaryCreateForm({
  expenses,
  paymentTypes,
  paymentSources,
}: {
  expenses: ExpensesWithInclude[]
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
}) {
  const initialState = { message: null, errors: {} }

  const [state, dispatch] = useFormState(createSummaryForMonth, initialState)
  const [selectedItems, setSelectedItems] = useState(expenses.map((item) => ({ ...item, checked: true })))
  const [total, setTotal] = useState(0)

  const handleItemChecked = (checked: boolean, id: string) => {
    const newSelectedItems = selectedItems.map((item) => {
      if (item.id === id) return { ...item, checked }
      return item
    })
    setSelectedItems(newSelectedItems)
  }

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

  useEffect(() => {
    const total = selectedItems.reduce((total, item) => {
      if (item.checked) {
        return (total += item.amount)
      }
      return total
    }, 0)

    setTotal(total)
  }, [selectedItems])

  const handleSubmit = (e: any) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const selectedItemsToSend = selectedItems
      .filter((item) => item.checked)
      .map((item) => {
        const { id, amount, paymentSourceId, paymentTypeId } = item
        return { id, amount, paymentSourceId, paymentTypeId }
      })

    formData.set('totalAmount', total.toString())
    formData.set('expenseItems', JSON.stringify(selectedItemsToSend))

    dispatch(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-full md:w-fit flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="date">
            Seleccione el mes para el resumen
          </label>
          <div>
            <input
              id="date"
              defaultValue={getToday()}
              name="date"
              type="month"
              className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
            />
          </div>
          {state.errors?.date ? (
            <div id="date-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.date.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <p className="mb-2 block text-sm font-medium">Seleccione los items a pagar</p>
          {selectedItems.map((expense) => (
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
                <Checkbox
                  className="h-8 w-8 rounded-md"
                  value={expense.id}
                  checked={expense.checked}
                  onCheckedChange={(e) => handleItemChecked(e as boolean, expense.id)}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 justify-end items-center">
            <p className="font-bold text-right">Total</p>
            <NumericFormat
              className="rounded-md text-sm w-full md:w-36"
              name="totalAmount"
              id="totalAmount"
              value={total}
              prefix={'$ '}
              thousandSeparator="."
              decimalScale={2}
              decimalSeparator=","
              onChange={(e) => setTotal(removeCurrencyMaskFromInput(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.EXPENSES.BASE_PATH}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>
          <Button type="submit">Generar resumen</Button>
        </div>
      </div>
    </form>
  )
}
