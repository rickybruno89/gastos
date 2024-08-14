'use client'
import { PAGES_URL } from '@/lib/routes'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { createSummaryForCreditCard } from '@/services/summary'
import { CreditCardExpenseItem, Prisma } from '@prisma/client'
import { formatCurrency, getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { NumericFormat } from 'react-number-format'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import ButtonLoadingSpinner from '@/components/ui/button-loading-spinner'

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

type CreditCardExpenseItemWithChecked = CreditCardExpenseItem & { checked: boolean }

export default function SummaryCreateForm({ creditCard }: { creditCard: CreditCardWithItems }) {
  const initialState = { message: null, errors: {} }
  const createSummaryForCreditCardWithId = createSummaryForCreditCard.bind(null, creditCard.id)

  const [state, dispatch] = useFormState(createSummaryForCreditCardWithId, initialState)
  const [selectedItems, setSelectedItems] = useState<CreditCardExpenseItemWithChecked[]>(
    creditCard.creditCardExpenseItems.map((item) => ({ ...item, checked: false }))
  )
  const [total, setTotal] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [taxes, setTaxes] = useState(0)
  const [datePicker, setDatePicker] = useState(getToday())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemIdToApplyDiscount, setItemIdToApplyDiscount] = useState<string | null>()
  const [discount, setDiscount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(false)
  }, [state])

  const handleChangeDatePicker = (date: string) => {
    setDatePicker(date)
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

    setSubtotal(total)
    setTaxes(0)
    setTotal(total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItems])

  const handleTotalChange = (e: any) => {
    const newTotal = removeCurrencyMaskFromInput(e.target.value)
    setTotal(newTotal)
    setTaxes(newTotal - subtotal)
  }

  const handleDiscount = () => {
    const itemToUpdate = selectedItems.find((item) => item.id === itemIdToApplyDiscount)
    const newPrice = itemToUpdate!.installmentsAmount - discount
    const newItems = selectedItems.map((selectedItem) =>
      selectedItem.id === itemToUpdate!.id ? { ...selectedItem, installmentsAmount: newPrice } : selectedItem
    )
    setItemIdToApplyDiscount(null)
    setDiscount(0)
    setSelectedItems(newItems)
    setIsDialogOpen(false)
  }

  const handleOpenDialog = (itemId: string) => {
    setItemIdToApplyDiscount(itemId)
    setIsDialogOpen(true)
    setDiscount(0)
  }

  const handleCloseDialog = () => {
    setItemIdToApplyDiscount(null)
    setDiscount(0)
    setIsDialogOpen(false)
  }

  const handleSubmit = (e: any) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)

    const selectedItemsToSend = selectedItems
      .filter((item) => item.checked)
      .map((item) => {
        const { id, installmentsAmount, installmentsPaid, installmentsQuantity } = item
        return { id, installmentsAmount, installmentsPaid, installmentsQuantity }
      })

    formData.set('taxesAmount', taxes.toString())
    formData.set('totalAmount', total.toString())
    formData.set('creditCardExpenseItems', JSON.stringify(selectedItemsToSend))

    dispatch(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col gap-4">
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
                      className="rounded-md w-32 px-2 py-1 focus-visible:ring-2 focus-visible:ring-orange-500"
                      value={item.installmentsAmount}
                      onChange={(e) => handleItemAmountChange(e.target.value, item.id)}
                      prefix={'$ '}
                      thousandSeparator="."
                      decimalScale={2}
                      decimalSeparator=","
                    />
                    <button className="text-orange-500" onClick={() => handleOpenDialog(item.id)}>
                      Desc.
                    </button>
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
            <div className="flex gap-1 justify-end items-center">
              <span className="font-bold">Subtotal: </span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex gap-1 justify-end items-center">
              <span className="font-bold">Impuestos, sellos, etc: </span>
              <span>{formatCurrency(taxes)}</span>
            </div>
            <div className="flex gap-2 justify-end items-center">
              <p className="font-bold">Total: </p>
              <NumericFormat
                inputMode="decimal"
                className="rounded-md w-36 px-2 py-1 focus-visible:ring-2 focus-visible:ring-orange-500"
                name="totalAmount"
                id="totalAmount"
                value={total}
                prefix={'$ '}
                thousandSeparator="."
                decimalScale={2}
                decimalSeparator=","
                onChange={handleTotalChange}
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
          <button
            type="submit"
            className="w-fit uppercase text-xs font-medium text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300"
          >
            {isLoading ? <ButtonLoadingSpinner /> : 'Generar resumen'}
          </button>
        </div>
      </div>
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        transition
        className="fixed inset-0 flex w-screen items-center justify-center bg-black/50  backdrop-blur-sm p-4 transition duration-300 ease-out data-[closed]:opacity-0"
      >
        <div className="fixed inset-0 z-10 w-screen ">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="text-white w-full max-w-md rounded-xl bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle className="font-bold mb-4">Aplicar descuento</DialogTitle>
              <Description>Ingrese el valor en ARS del descuento a aplicar</Description>
              <div className="my-4 text-black">
                <NumericFormat
                  inputMode="decimal"
                  className="rounded-md w-36 px-2 py-1 focus-visible:ring-2 focus-visible:ring-orange-500"
                  name="discount"
                  id="discount"
                  value={discount}
                  prefix={'$ '}
                  thousandSeparator="."
                  decimalScale={2}
                  decimalSeparator=","
                  onChange={(e) => setDiscount(removeCurrencyMaskFromInput(e.target.value))}
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  className="inline-flex items-center gap-2 rounded-md py-1.5 px-3 text-sm/6 font-semibold  shadow-inner shadow-white/10 "
                  onClick={handleCloseDialog}
                >
                  Cancelar
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-orange-500 text-white py-1.5 px-3 text-sm/6 font-semibold  shadow-inner shadow-white/10 "
                  onClick={handleDiscount}
                >
                  Aplicar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </form>
  )
}
