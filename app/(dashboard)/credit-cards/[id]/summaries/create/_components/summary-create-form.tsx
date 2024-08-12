'use client'
import { Button } from '@/components/ui/button'
import { PAGES_URL } from '@/lib/routes'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { createSummaryForCreditCard } from '@/services/summary'
import { Prisma } from '@prisma/client'
import { formatCurrency, getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { NumericFormat } from 'react-number-format'

type CreditCardWithItems = Prisma.CreditCardGetPayload<{
  include: {
    creditCardExpenseItems: {
      include: {
        sharedWith: true
      }
    }
    paymentSummaries: true
  }
}>

export default function SummaryCreateForm({ creditCard }: { creditCard: CreditCardWithItems }) {
  const initialState = { message: null, errors: {} }
  const createSummaryForCreditCardWithId = createSummaryForCreditCard.bind(null, creditCard.id)

  const [state, dispatch] = useFormState(createSummaryForCreditCardWithId, initialState)
  const [selectedItems, setSelectedItems] = useState(
    creditCard.creditCardExpenseItems.map((item) => ({ ...item, checked: getToday() >= item.paymentBeginning }))
  )
  const [total, setTotal] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [datePicker, setDatePicker] = useState(getToday())

  const handleChangeDatePicker = (date: string) => {
    setDatePicker(date)
    const newSelectedItems = selectedItems.map((item) => {
      return { ...item, checked: date >= item.paymentBeginning }
    })
    setSelectedItems(newSelectedItems)
  }

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
        return { ...item, installmentsAmount: amount }
      }
      return item
    })
    setSelectedItems(newSelectedItems)
  }

  useEffect(() => {
    const total = selectedItems.reduce((total, item) => {
      if (item.checked) {
        return (total += item.installmentsAmount)
      }
      return total
    }, 0)

    setTotal(total + (total * creditCard.taxesPercent) / 100)
    setSubtotal(total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems])

  const handleSubmit = (e: any) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const selectedItemsToSend = selectedItems
      .filter((item) => item.checked)
      .map((item) => {
        const { id, installmentsAmount, installmentsPaid, installmentsQuantity } = item
        return { id, installmentsAmount, installmentsPaid, installmentsQuantity }
      })

    formData.set('totalAmount', total.toString())
    formData.set('creditCardExpenseItems', JSON.stringify(selectedItemsToSend))

    dispatch(formData)
  }

  const getTaxesAmout = () => {
    const totalAmount = selectedItems
      .filter((item) => item.checked)
      .reduce((totalAcc, current) => {
        return (totalAcc += current.installmentsAmount)
      }, 0)
    return formatCurrency((totalAmount * creditCard.taxesPercent) / 100)
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
              value={datePicker}
              onChange={(e) => handleChangeDatePicker(e.target.value)}
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
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="date">
            Fecha de vencimiento
          </label>
          <div>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
            />
          </div>
          {state.errors?.dueDate ? (
            <div id="dueDate-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.dueDate.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <p className="mb-2 block text-sm font-medium">Seleccione los items a pagar</p>
          <div>
            <div className="flex flex-col gap-4">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <label
                    htmlFor={`creditCardExpenseItems[${item.id}]`}
                    className="flex flex-wrap gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 items-center"
                  >
                    <div>
                      <p className="font-bold">{item.description}</p>
                      {item.recurrent ? (
                        <p>Pago recurrente</p>
                      ) : (
                        <p>
                          Cuota {item.installmentsPaid + 1} de {item.installmentsQuantity}
                        </p>
                      )}
                    </div>
                  </label>
                  <div className="flex justify-end items-center gap-2">
                    <NumericFormat
                      inputMode="decimal"
                      className="rounded-md w-36 px-2 py-1"
                      value={item.installmentsAmount}
                      onChange={(e) => handleItemAmountChange(e.target.value, item.id)}
                      prefix={'$ '}
                      thousandSeparator="."
                      decimalScale={2}
                      decimalSeparator=","
                    />
                    <Checkbox
                      className="h-8 w-8 rounded-md"
                      id={`creditCardExpenseItems[${item.id}]`}
                      name="creditCardExpenseItems"
                      value={item.id}
                      checked={item.checked}
                      onCheckedChange={(e) => handleItemChecked(e as boolean, item.id)}
                    />
                  </div>
                </div>
              ))}
              {state.errors?.creditCardExpenseItems ? (
                <div id="creditCardExpenseItems-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                  {state.errors.creditCardExpenseItems.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-right">
            <div>
              <span className="font-bold">Subtotal: {formatCurrency(subtotal)}</span>
            </div>
            <div>
              <p className="font-bold">
                Impuestos y sellados: <span>{getTaxesAmout()}</span>
              </p>
            </div>
            <div className="flex gap-2 justify-end items-center">
              <p className="font-bold">Total</p>
              <NumericFormat
                inputMode="decimal"
                className="rounded-md w-36 px-2 py-1"
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
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.CREDIT_CARDS.DETAILS(creditCard.id)}
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
