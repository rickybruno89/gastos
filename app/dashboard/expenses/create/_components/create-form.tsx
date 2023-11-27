'use client';

import { Button } from '@/components/ui/button';
import { PAGES_URL } from '@/lib/routes';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { Currency, PaymentSource, PaymentType, Person } from '@prisma/client';
import LinkButton from '@/components/ui/link-button';
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from 'react';
import { formatCurrency, removeCurrencyMaskFromInput } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox"
import { InputNumberFormat } from '@react-input/number-format';
import { createExpense } from '@/services/expense';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ExpenseCreateForm({
  personsToShare,
  currencies,
  paymentTypes,
  paymentSources
}: {
  personsToShare: Person[]
  currencies: Currency[]
  paymentTypes: PaymentType[]
  paymentSources: PaymentSource[]

}) {
  const initialState = { message: null, errors: {} };

  const [state, dispatch] = useFormState(createExpense, initialState);

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit flex flex-col gap-4">

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor='description'>
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
              />
            </div>
            {state.errors?.description ? (
              <div
                id="description-error"
                aria-live="polite"
                className="mt-2 text-sm text-red-500"
              >
                {state.errors.description.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium">
            Seleccione con quien compartirá el gasto
          </span>
          <div>
            <div className="flex flex-wrap gap-4" >
              {
                personsToShare.map(person =>
                  <div key={person.id} className='flex items-center justify-center gap-x-1'>
                    <Checkbox id={`sharedWith[${person.id}]`} name="sharedWith" value={person.id} />
                    <label
                      htmlFor={`sharedWith[${person.id}]`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {person.name}
                    </label>
                  </div>
                )

              }
              <LinkButton href={`${PAGES_URL.SETTINGS.PERSON_TO_SHARE_EXPENSE}?callbackUrl=${PAGES_URL.EXPENSES.CREATE}`}>
                <PlusIcon className='w-4' />
                Crear persona
              </LinkButton>
              {state.errors?.sharedWith ? (
                <div
                  id="sharedWith-error"
                  aria-live="polite"
                  className="mt-2 text-sm text-red-500"
                >
                  {state.errors.sharedWith.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor='currencyId'>
            Seleccione tipo de moneda
          </label>
          <div>
            {
              <select
                name="currencyId"
                id="currencyId"
                aria-describedby="currencyId"
                className='w-full rounded-md'
                defaultValue={currencies.find(currency => currency.useAsDefault)?.id}
              >
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id} >
                    {currency.name}
                  </option>
                ))}
              </select>
            }
          </div>
          {state.errors?.currencyId ? (
            <div
              id="currencyId-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
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
              <InputNumberFormat name="amount" locales="es-AR" maximumFractionDigits={2} format='currency' currency='ARS' className='rounded-md w-full'
                id="amount" />
            </div>
            {state.errors?.amount ? (
              <div
                id="amount-error"
                aria-live="polite"
                className="mt-2 text-sm text-red-500"
              >
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
            {
              !paymentTypes.length ? (
                <LinkButton href={`${PAGES_URL.SETTINGS.PAYMENT_TYPE_CREATE}?callbackUrl=${PAGES_URL.EXPENSES.CREATE}`}>
                  <PlusIcon className='w-5' />
                  Crear nueva forma de pago
                </LinkButton>
              ) : (
                <select
                  name="paymentTypeId"
                  id="paymentTypeId"
                  aria-describedby="paymentTypeId"
                  className='w-full rounded-md'
                  defaultValue={""}
                >
                  <option disabled value="">Seleccione una opción</option>
                  {paymentTypes.map((paymentType) => (
                    <option key={paymentType.id} value={paymentType.id} >
                      {paymentType.name}
                    </option>
                  ))}
                </select>
              )
            }
          </div>
          {state.errors?.paymentTypeId ? (
            <div
              id="customer-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
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
            {
              !paymentSources.length ? (
                <LinkButton href={`${PAGES_URL.SETTINGS.PAYMENT_SOURCE_CREATE}?callbackUrl=${PAGES_URL.EXPENSES.CREATE}`}>
                  <PlusIcon className='w-5' />
                  Crear nueva canal de pago
                </LinkButton>
              ) : (
                <select
                  name="paymentSourceId"
                  id="paymentSourceId"
                  aria-describedby="paymentSourceId"
                  className='w-full rounded-md'
                  defaultValue={""}
                >
                  <option disabled value="">Seleccione una opción</option>
                  {paymentSources.map((paymentSource) => (
                    <option key={paymentSource.id} value={paymentSource.id} >
                      {paymentSource.name}
                    </option>
                  ))}
                </select>
              )
            }
          </div>
          {state.errors?.paymentSourceId ? (
            <div
              id="paymentSourceId-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
              {state.errors.paymentSourceId.map((error: string) => (
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
              />
            </div>
            {state.errors?.notes ? (
              <div
                id="notes-error"
                aria-live="polite"
                className="mt-2 text-sm text-red-500"
              >
                {state.errors.notes.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>






        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.EXPENSES.BASE_PATH}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>
          <Button type="submit">Guardar</Button>
        </div>
      </div>
    </form >
  );
}
