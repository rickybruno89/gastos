'use client'
import { Button } from '@/components/ui/button'
import { PAGES_URL } from '@/lib/routes'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { PaymentSource, PaymentType, Person, Prisma } from '@prisma/client'
import LinkButton from '@/components/ui/link-button'
import { Checkbox } from '@/components/ui/checkbox'
import { createExpense, updateExpense } from '@/services/expense'
import { NumericFormat } from 'react-number-format'
import { useSearchParams } from 'next/navigation'

type ExpenseItemWithInclude = Prisma.ExpenseGetPayload<{
  include: {
    paymentSource: true
    paymentType: true
    sharedWith: true
  }
}>

export default function UpsertExpenseForm({
  expenseItem,
  personsToShare,
  paymentTypes,
  paymentSources,
}: {
  expenseItem?: ExpenseItemWithInclude
  personsToShare: Person[]
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]
}) {
  const callbackUrl = useSearchParams().get('callbackUrl') || PAGES_URL.EXPENSES.BASE_PATH

  const initialState = { message: null, errors: {} }

  const upsertExpenseItemWithId = expenseItem
    ? updateExpense.bind(null, expenseItem.id, callbackUrl)
    : createExpense

  const [state, dispatch] = useFormState(upsertExpenseItemWithId, initialState)

  return (
    <form action={dispatch}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="description">
            Descripcion
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <input
                id="description"
                name="description"
                type="text"
                aria-describedby="description-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
                defaultValue={expenseItem?.description}
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
          <span className="mb-2 block text-sm font-medium">Seleccione con quien compartirá el gasto</span>
          <div>
            <div className="flex flex-wrap gap-4">
              {personsToShare.map((person) => (
                <div key={person.id} className="flex items-center justify-center gap-x-1">
                  <Checkbox
                    id={`sharedWith[${person.id}]`}
                    name="sharedWith"
                    value={person.id}
                    defaultChecked={expenseItem?.sharedWith.some((sharedWith) => sharedWith.id === person.id)}
                  />
                  <label
                    htmlFor={`sharedWith[${person.id}]`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {person.name}
                  </label>
                </div>
              ))}
              <LinkButton href={PAGES_URL.SETTINGS.BASE_PATH}>
                <PlusIcon className="w-4" />
                Crear persona
              </LinkButton>
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
                className="rounded-md w-full"
                prefix={'$ '}
                thousandSeparator="."
                decimalScale={2}
                decimalSeparator=","
                name="amount"
                id="amount"
                defaultValue={expenseItem?.amount}
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
                defaultValue={expenseItem?.paymentTypeId}
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
                defaultValue={expenseItem?.paymentSourceId}
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
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="dueDate">
            Fecha de vencimiento
          </label>
          <div>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              defaultValue={expenseItem?.dueDate || ''}
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
        <div>
          <label htmlFor="notes" className="mb-2 block text-sm font-medium">
            Notas
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative">
              <textarea
                defaultValue={expenseItem?.notes}
                id="notes"
                name="notes"
                aria-describedby="name-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
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
            href={callbackUrl}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>
          <Button type="submit" className='bg-orange-500 px-4 py-2 text-white hover:bg-gray-700'>Guardar</Button>
        </div>
      </div>
    </form>
  )
}
