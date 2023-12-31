'use client'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useFormState } from 'react-dom'
import { createCreditCard, updateCreditCard } from '@/services/credit-card'
import { Button } from '@/components/ui/button'
import { CreditCard, PaymentSource, PaymentType } from '@prisma/client'
import { PAGES_URL } from '@/lib/routes'
import LinkButton from '@/components/ui/link-button'
import { useState } from 'react'

const DEFAULT_COLOR = '#143273'
const DEFAULT_TEXT_COLOR = '#FFFFFF'

export default function CreditCardCreateUpsertForm({
  creditCard,
  paymentTypes,
  paymentSources,
}: {
  creditCard?: CreditCard
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
}) {
  const initialState = { message: null, errors: {} }
  const upsertCreditCardWithId = creditCard ? updateCreditCard.bind(null, creditCard.id) : createCreditCard
  const [state, dispatch] = useFormState(upsertCreditCardWithId, initialState)

  const [color, setColor] = useState(creditCard?.color || DEFAULT_COLOR)
  const [textColor, setTextColor] = useState(creditCard?.textColor || DEFAULT_TEXT_COLOR)
  const [name, setName] = useState(creditCard?.name || 'Nombre')

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit flex flex-col gap-4">
        <div>
          <label htmlFor="creditCardName" className="mb-2 block text-sm font-medium">
            Nombre
          </label>
          <div className="relative rounded-md">
            <div className="relative w-full">
              <input
                defaultValue={creditCard?.name}
                id="creditCardName"
                name="creditCardName"
                type="text"
                placeholder="Galicia - Visa"
                aria-describedby="creditCardName-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {state.errors?.creditCardName ? (
              <div id="creditCardName-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                {state.errors.creditCardName.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="taxesPercent" className="mb-2 block text-sm font-medium">
            Impuestos de sellado
          </label>
          <div className="relative rounded-md">
            <div className="relative w-20">
              <input
                defaultValue={creditCard?.taxesPercent}
                id="taxesPercent"
                name="taxesPercent"
                type="number"
                step="0.01"
                placeholder="Ej: 1"
                className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              />
              <div className="pointer-events-none absolute py-[7px] top-0 right-3 text-black peer-focus:text-gray-900">
                %
              </div>
            </div>
            {state.errors?.taxesPercent ? (
              <div id="creditCardName-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                {state.errors.taxesPercent.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <label htmlFor="paymentTypeId" className="mb-2 block text-sm font-medium">
            Seleccione la forma de pago a usar
          </label>
          <div>
            {!paymentTypes.length ? (
              <LinkButton href={PAGES_URL.SETTINGS.BASE_PATH}>
                <PlusIcon className="w-5" />
                Crear nueva forma de pago
              </LinkButton>
            ) : (
              <select
                name="paymentTypeId"
                id="paymentTypeId"
                aria-describedby="paymentTypeId"
                className="w-full rounded-md"
                defaultValue={creditCard?.paymentTypeId || ''}
              >
                <option disabled value="">
                  Seleccione una opción
                </option>
                {paymentTypes.map((paymentType) => (
                  <option key={paymentType.id} value={paymentType.id}>
                    {paymentType.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {state.errors?.paymentTypeId ? (
            <div id="customer-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.paymentTypeId.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <label htmlFor="paymentSourceId" className="mb-2 block text-sm font-medium">
            Seleccione un canal de pago
          </label>
          <div>
            {!paymentSources.length ? (
              <LinkButton href={PAGES_URL.SETTINGS.BASE_PATH}>
                <PlusIcon className="w-5" />
                Crear nueva canal de pago
              </LinkButton>
            ) : (
              <select
                name="paymentSourceId"
                id="paymentSourceId"
                aria-describedby="paymentSourceId"
                className="w-full rounded-md"
                defaultValue={creditCard?.paymentSourceId || ''}
              >
                <option disabled value="">
                  Seleccione una opción
                </option>
                {paymentSources.map((paymentSource) => (
                  <option key={paymentSource.id} value={paymentSource.id}>
                    {paymentSource.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {state.errors?.paymentSourceId ? (
            <div id="paymentSourceId-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.paymentSourceId.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex justify-between gap-8">
          <div>
            <label htmlFor="color" className="mb-2 block text-sm font-medium">
              Elija un color de tarjeta
            </label>
            <input
              defaultValue={creditCard?.color || DEFAULT_COLOR}
              type="color"
              id="color"
              name="color"
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="textColor" className="mb-2 block text-sm font-medium">
              Elija un color de texto
            </label>
            <select
              name="textColor"
              id="textColor"
              aria-describedby="textColor"
              className="rounded-md w-full py-1"
              defaultValue={creditCard?.textColor || DEFAULT_TEXT_COLOR}
              onChange={(e) => setTextColor(e.target.value)}
            >
              <option value={'#FFFFFF'}>Blanco</option>
              <option value={'#000000'}>Negro</option>
            </select>
          </div>
        </div>
        Tu tarjeta quedará asi
        <div
          style={{ backgroundColor: color, color: textColor }}
          className="w-full md:w-[350px] aspect-video rounded-md shadow-xl p-4  flex flex-col justify-between"
        >
          <h1 className="font-bold">{name}</h1>
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.CREDIT_CARDS.BASE_PATH}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>
          <Button type="submit">{creditCard ? 'Modificar' : 'Crear'}</Button>
        </div>
      </div>
    </form>
  )
}
