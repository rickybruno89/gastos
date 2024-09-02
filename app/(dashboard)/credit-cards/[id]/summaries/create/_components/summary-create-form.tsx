'use client'
import { PAGES_URL } from '@/lib/routes'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { createSummaryForCreditCard } from '@/services/summary'
import { CreditCardExpenseItem, Prisma } from '@prisma/client'
import { formatCurrency, formatLocaleDate, getToday, removeCurrencyMaskFromInput } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { NumericFormat } from 'react-number-format'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import ButtonLoadingSpinner from '@/components/ui/button-loading-spinner'
import { useRouter, useSearchParams } from 'next/navigation'
import Lottie from 'react-lottie'
import * as checkAnimation from '../../../../../../../public/animations/check.json'
import * as loadingAnimation from '../../../../../../../public/animations/loading.json'

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

type CreditCardExpenseItemWithChecked = CreditCardExpenseItem & { checked: boolean; discount: number }

export default function SummaryCreateForm({ creditCard }: { creditCard: CreditCardWithItems }) {
  const initialState = { message: null, errors: {}, success: false }

  const callbackUrl = useSearchParams().get('callbackUrl') || PAGES_URL.CREDIT_CARDS.DETAILS(creditCard.id)

  const createSummaryForCreditCardWithId = createSummaryForCreditCard.bind(null, creditCard.id)

  const [state, dispatch] = useFormState(createSummaryForCreditCardWithId, initialState)

  const [creditCardWithItems, setCreditCardWithItems] = useState(creditCard)

  const [selectedItems, setSelectedItems] = useState<CreditCardExpenseItemWithChecked[]>(
    creditCardWithItems.creditCardExpenseItems.map((item) => ({ ...item, checked: false, discount: 0 }))
  )
  const [total, setTotal] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [taxes, setTaxes] = useState(0)
  const [datePicker, setDatePicker] = useState(getToday())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [itemIdToApplyDiscount, setItemIdToApplyDiscount] = useState<string | null>()
  const [itemDiscount, setItemDiscount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (state.success) {
      setTimeout(() => {
        setIsLoading(false)
        setTimeout(() => {
          router.replace(callbackUrl)
        }, 2500)
      }, 2500)
    } else {
      setIsLoading(false)
    }
  }, [state])

  useEffect(() => {
    setCreditCardWithItems(creditCard)
  }, [creditCard])

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
        return (total += item.installmentsAmount - item.discount)
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
    const newItems = selectedItems.map((selectedItem) =>
      selectedItem.id === itemToUpdate!.id ? { ...selectedItem, discount: itemDiscount || 0 } : selectedItem
    )
    setItemIdToApplyDiscount(null)
    setItemDiscount(0)
    setSelectedItems(newItems)
    setIsDialogOpen(false)
  }

  const handleOpenDialog = (item: CreditCardExpenseItemWithChecked) => {
    setItemIdToApplyDiscount(item.id)
    setIsDialogOpen(true)
    setItemDiscount(item.discount)
  }

  const handleCloseDialog = () => {
    setItemIdToApplyDiscount(null)
    setIsDialogOpen(false)
    setItemDiscount(0)
  }

  const handleSubmit = (formData: FormData) => {
    setIsLoading(true)
    console.log('here')

    const selectedItemsToSend = selectedItems
      .filter((item) => item.checked)
      .map((item) => {
        const { id, installmentsAmount, installmentsPaid, installmentsQuantity } = item
        return { id, installmentsAmount: installmentsAmount - item.discount, installmentsPaid, installmentsQuantity }
      })

    formData.set('taxesAmount', taxes.toString())
    formData.set('totalAmount', total.toString())
    formData.set('creditCardExpenseItems', JSON.stringify(selectedItemsToSend))

    dispatch(formData)
  }

  return (
    <form action={handleSubmit}>
      {state.success && !isLoading ? (
        <div className="flex flex-col justify-center gap-10 items-center cursor-default h-screen fixed top-0 z-50 bg-white left-0 w-full">
          <div className="max-w-[200px] md:max-w-[300px] flex flex-col justify-center items-center w-full">
            <Lottie
              options={{
                loop: false,
                autoplay: true,
                animationData: checkAnimation,
              }}
              isStopped={false}
              isPaused={false}
              speed={0.7}
              isClickToPauseDisabled={true}
            />
            <h1 className="font-bold text-2xl text-orange-400 text-center">{state.message}</h1>
          </div>
        </div>
      ) : null}
      {isLoading ? (
        <div className="flex flex-col justify-center gap-10 items-center cursor-default h-screen fixed top-0 z-50 bg-white left-0 w-full">
          <div className="max-w-[200px] md:max-w-[300px] flex flex-col justify-center items-center w-full">
            <Lottie
              options={{
                loop: true,
                autoplay: true,
                animationData: loadingAnimation,
              }}
              isStopped={false}
              isPaused={false}
              isClickToPauseDisabled={true}
            />
            <span className="font-bold text-2xl text-purple-500 animate-pulse">Guardando...</span>
          </div>
        </div>
      ) : null}
      <div className={`flex-col gap-4 ${!state.success && !isLoading ? 'flex' : 'hidden'}`}>
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
                      {item.paymentBeginning > datePicker ? (
                        <div className="text-purple-500">
                          <p>Comienzo del pago: </p>
                          <p>{formatLocaleDate(item.paymentBeginning)}</p>
                        </div>
                      ) : null}
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
                    <button className="text-orange-500" onClick={() => handleOpenDialog(item)}>
                      {item.discount ? `(- ${formatCurrency(item.discount)})` : 'Desc.'}
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
            href={PAGES_URL.CREDIT_CARDS.DETAILS(creditCardWithItems.id)}
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
                  value={itemDiscount}
                  prefix={'$ '}
                  thousandSeparator="."
                  decimalScale={2}
                  decimalSeparator=","
                  onChange={(e) => setItemDiscount(removeCurrencyMaskFromInput(e.target.value))}
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
