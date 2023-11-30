'use client'

import { Button } from '@/components/ui/button'
import { PAGES_URL } from '@/lib/routes'
import { createCreditCardExpenseItem, updateCreditCardExpenseItem } from '@/services/credit-card'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { useFormState } from 'react-dom'
import { Currency, Person, Prisma } from '@prisma/client'
import LinkButton from '@/components/ui/link-button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useEffect, useState } from 'react'
import { formatCurrency, getNextMonthDate, removeCurrencyMaskFromInput } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { NumericFormat } from 'react-number-format'

type CreditCardExpenseItemWithSharedPerson = Prisma.CreditCardExpenseItemGetPayload<{
  include: {
    sharedWith: true
  }
}>
export default function UpsertCreditCardExpenseItemForm({
  creditCardId,
  creditCardExpenseItem,
  personsToShare,
  currencies,
}: {
  creditCardId: string
  creditCardExpenseItem?: CreditCardExpenseItemWithSharedPerson
  personsToShare: Person[]
  currencies: Currency[]
}) {
  const initialState = { message: null, errors: {} }
  const upsertCreditCardExpenseItemWithId = creditCardExpenseItem
    ? updateCreditCardExpenseItem.bind(null, creditCardExpenseItem.id)
    : createCreditCardExpenseItem.bind(null, creditCardId)

  const [state, dispatch] = useFormState(upsertCreditCardExpenseItemWithId, initialState)

  const [isRecurrent, setIsRecurrent] = useState<boolean>(creditCardExpenseItem?.recurrent || false)
  const [totalAmount, setTotalAmount] = useState(creditCardExpenseItem?.amount || 0)
  const [installmentsQuantity, setInstallmentsQuantity] = useState(creditCardExpenseItem?.installmentsQuantity || 1)

  useEffect(() => {
    if (isRecurrent) {
      setTotalAmount(creditCardExpenseItem?.installmentsAmount || totalAmount)
    } else {
      setTotalAmount(creditCardExpenseItem?.amount || totalAmount)
    }
  }, [isRecurrent])

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit flex flex-col gap-4">
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
              <LinkButton
                href={`${
                  PAGES_URL.SETTINGS.PERSON_TO_SHARE_EXPENSE
                }?callbackUrl=${PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(creditCardId)}`}
              >
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
          <label className="mb-2 block text-sm font-medium">Seleccione tipo de moneda</label>
          <div>
            {
              <select
                name="currencyId"
                aria-describedby="currencyId"
                className="w-full rounded-md"
                defaultValue={creditCardExpenseItem?.currencyId}
              >
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.name}
                  </option>
                ))}
              </select>
            }
          </div>
          {state.errors?.currencyId ? (
            <div id="currencyId-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.currencyId.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            Monto total
          </label>
          <div className="relative rounded-md">
            <div className="relative ">
              <NumericFormat
                className="rounded-md w-full"
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
                <Label htmlFor="false">NO</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="true" />
                <Label htmlFor="true">SI</Label>
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
            Cancel
          </Link>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </div>
    </form>
  )
}
