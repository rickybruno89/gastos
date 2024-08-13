'use client'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { createCreditCard, updateCreditCard } from '@/services/credit-card'
import { Button } from '@/components/ui/button'
import { CreditCard } from '@prisma/client'
import { PAGES_URL } from '@/lib/routes'
import { useState } from 'react'

const DEFAULT_COLOR = '#143273'
const DEFAULT_TEXT_COLOR = '#FFFFFF'

export default function CreditCardCreateUpsertForm({ creditCard }: { creditCard?: CreditCard }) {
  const initialState = { message: null, errors: {} }
  const upsertCreditCardWithId = creditCard ? updateCreditCard.bind(null, creditCard.id) : createCreditCard
  const [state, dispatch] = useFormState(upsertCreditCardWithId, initialState)

  const [color, setColor] = useState(creditCard?.color || DEFAULT_COLOR)
  const [textColor, setTextColor] = useState(creditCard?.textColor || DEFAULT_TEXT_COLOR)
  const [name, setName] = useState(creditCard?.name || 'Nombre')

  return (
    <form action={dispatch}>
      <div className="flex flex-col gap-4">
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
          <button type="submit" className="bg-orange-500 px-4 py-2 text-white hover:bg-gray-700">
            {creditCard ? 'Modificar' : 'Crear'}
          </button>
        </div>
      </div>
    </form>
  )
}
