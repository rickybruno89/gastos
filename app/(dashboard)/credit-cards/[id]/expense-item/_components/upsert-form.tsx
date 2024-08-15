'use client'
import { PAGES_URL } from '@/lib/routes'
import { createCreditCardExpenseItem, updateCreditCardExpenseItem } from '@/services/credit-card'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { Person, Prisma } from '@prisma/client'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useEffect, useState } from 'react'
import { formatCurrency, getNextMonthDate, removeCurrencyMaskFromInput } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { NumericFormat } from 'react-number-format'
import ButtonLoadingSpinner from '@/components/ui/button-loading-spinner'
import { useRouter, useSearchParams } from 'next/navigation'
import Lottie from 'react-lottie'
import * as checkAnimation from '../../../../../../public/animations/check.json'
import * as loadingAnimation from '../../../../../../public/animations/loading.json'

type CreditCardExpenseItemWithSharedPerson = Prisma.CreditCardExpenseItemGetPayload<{
  include: {
    sharedWith: true
  }
}>
export default function UpsertCreditCardExpenseItemForm({
  creditCardId,
  creditCardExpenseItem,
  personsToShare,
}: {
  creditCardId: string
  creditCardExpenseItem?: CreditCardExpenseItemWithSharedPerson
  personsToShare: Person[]
}) {
  const initialState = { message: null, errors: {}, success: false }

  const callbackUrl = useSearchParams().get('callbackUrl') || PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId)

  const upsertCreditCardExpenseItemWithId = creditCardExpenseItem
    ? updateCreditCardExpenseItem.bind(null, creditCardExpenseItem.id)
    : createCreditCardExpenseItem.bind(null, creditCardId)

  const [state, dispatch] = useFormState(upsertCreditCardExpenseItemWithId, initialState)

  const [isRecurrent, setIsRecurrent] = useState<boolean>(creditCardExpenseItem?.recurrent || false)
  const [totalAmount, setTotalAmount] = useState(creditCardExpenseItem?.amount || 0)
  const [installmentsQuantity, setInstallmentsQuantity] = useState(creditCardExpenseItem?.installmentsQuantity || 1)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (state.success) {
      setIsLoading(true)
      setTimeout(() => {
        setIsLoading(false)
        setTimeout(() => {
          router.replace(callbackUrl)
        }, 2500)
      }, 2500)
    }
  }, [state])

  const handleSave = (formData: FormData) => {
    dispatch(formData)
  }

  useEffect(() => {
    if (isRecurrent) {
      setTotalAmount(creditCardExpenseItem?.installmentsAmount || totalAmount)
    } else {
      setTotalAmount(creditCardExpenseItem?.amount || totalAmount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecurrent])

  if (state.success && !isLoading) {
    return (
      <div className="flex flex-col justify-center gap-10 items-center cursor-default h-screen fixed top-0 z-50 bg-white left-0 w-full">
        <div className="max-w-[150px] md:max-w-[300px] flex flex-col justify-center items-center w-full">
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
          <h1 className="font-bold text-2xl text-orange-400">{state.message}</h1>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center gap-10 items-center cursor-default h-screen fixed top-0 z-50 bg-white left-0 w-full">
        <div className="max-w-[150px] md:max-w-[300px] flex flex-col justify-center items-center w-full">
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
          <span className="font-bold text-2xl text-purple-500 animate-pulse">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <form action={handleSave}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Descripcion</label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="description"
                name="description"
                type="text"
                defaultValue={creditCardExpenseItem?.description}
                aria-describedby="description-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
            {state.errors?.description ? (
              <div id="description-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                {state.errors.description.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Seleccione con quien compartirá el gasto</label>
          <div>
            <div className="flex flex-wrap gap-4">
              {personsToShare.map((person) => (
                <div key={person.id} className="flex items-center justify-center gap-x-1">
                  <Checkbox
                    id={`sharedWith[${person.id}]`}
                    name="sharedWith"
                    value={person.id}
                    defaultChecked={creditCardExpenseItem?.sharedWith.some((sharedWith) => sharedWith.id === person.id)}
                  />
                  <label
                    htmlFor={`sharedWith[${person.id}]`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {person.name}
                  </label>
                </div>
              ))}
              <Link href={PAGES_URL.SETTINGS.BASE_PATH}>
                <div className="flex justify-center items-center gap-2 text-orange-500">
                  <PlusIcon className="w-4" />
                  Crear persona
                </div>
              </Link>
              {state.errors?.sharedWith ? (
                <div id="sharedWith-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                  {state.errors.sharedWith.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            Monto total
          </label>
          <div className="relative rounded-md">
            <div className="relative ">
              <NumericFormat
                inputMode="decimal"
                className="rounded-md w-full focus-visible:ring-2 focus-visible:ring-orange-500"
                onChange={(e) => setTotalAmount(removeCurrencyMaskFromInput(e.target.value))}
                prefix={'$ '}
                thousandSeparator="."
                decimalScale={2}
                decimalSeparator=","
                name="amount"
                id="amount"
                defaultValue={
                  creditCardExpenseItem?.recurrent
                    ? creditCardExpenseItem?.installmentsAmount
                    : creditCardExpenseItem?.amount
                }
              />
            </div>
            {state.errors?.amount ? (
              <div id="amount-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                {state.errors.amount.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">¿Es un pago recurrente? (todos los meses)</label>
          <div>
            <RadioGroup
              name="recurrent"
              defaultValue={creditCardExpenseItem?.recurrent.toString() || 'false'}
              className="flex"
              onValueChange={(e) => setIsRecurrent(e === 'true')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="false" />
                <label htmlFor="false">NO</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <label htmlFor="true">SI</label>
              </div>
            </RadioGroup>
          </div>
          {state.errors?.recurrent ? (
            <div id="recurrent-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.recurrent.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>

        {!isRecurrent ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium">Cantidad de cuotas</label>
              <div>
                <select
                  name="installmentsQuantity"
                  aria-describedby="installmentsQuantity"
                  className="w-full rounded-md"
                  onChange={(e) => setInstallmentsQuantity(parseInt(e.target.value))}
                  defaultValue={creditCardExpenseItem?.installmentsQuantity}
                >
                  {Array.from(Array(24)).map((_, index) => (
                    <option key={index + 1} value={(index + 1).toString()}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </div>
              {state.errors?.installmentsQuantity ? (
                <div id="installmentsQuantity-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                  {state.errors.installmentsQuantity.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Monto de cada cuota</label>
              <div className="relative mt-2 rounded-md">
                <div className="relative">
                  <input
                    disabled
                    name="installmentsAmount"
                    id="installmentsAmount"
                    className="rounded-md w-full"
                    value={formatCurrency(totalAmount / installmentsQuantity)}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Cuotas pagadas</label>
              <div>
                <select
                  name="installmentsPaid"
                  aria-describedby="installmentsPaid"
                  className="w-full rounded-md"
                  defaultValue={creditCardExpenseItem?.installmentsPaid}
                >
                  {Array.from(Array(installmentsQuantity + 1)).map((_, index) => (
                    <option key={index} value={index.toString()}>
                      {index}
                    </option>
                  ))}
                </select>
              </div>
              {state.errors?.installmentsPaid ? (
                <div id="installmentsPaid-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                  {state.errors.installmentsPaid.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
        <div>
          <label className="mb-2 block text-sm font-medium">Comienzo del pago</label>
          <div>
            <input
              id="paymentBeginning"
              name="paymentBeginning"
              type="month"
              className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              defaultValue={creditCardExpenseItem?.paymentBeginning || getNextMonthDate()}
            />
          </div>
          {state.errors?.paymentBeginning ? (
            <div id="paymentBeginning-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.paymentBeginning.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="notes" className="mb-2 block text-sm font-medium">
            Notas
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <textarea
                id="notes"
                name="notes"
                aria-describedby="name-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
                defaultValue={creditCardExpenseItem?.notes}
              />
            </div>
            {state.errors?.notes ? (
              <div id="notes-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                {state.errors.notes.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.CREDIT_CARDS.DETAILS(creditCardId)}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            className="bg-orange-500 px-4 py-2 text-white font-semibold hover:bg-gray-700 rounded-md"
          >
            {isLoading ? <ButtonLoadingSpinner /> : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
  )
}
