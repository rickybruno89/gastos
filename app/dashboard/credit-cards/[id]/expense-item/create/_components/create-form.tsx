'use client';

import { Button } from '@/components/ui/button';
import { PAGES_URL } from '@/lib/routes';
import { createCreditCardExpenseItem } from '@/services/credit-card';
import { CurrencyDollarIcon } from '@heroicons/react/20/solid';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { Currency, Person } from '@prisma/client';
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import LinkButton from '@/components/ui/link-button';
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState } from 'react';
import { formatCurrency, removeCurrencyMaskFromInput } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox"
import { InputNumberFormat } from '@react-input/number-format';

export default function CreditCardExpenseItemCreateForm({ creditCardId, personsToShare,
  currencies }: {
    creditCardId: string, personsToShare: Person[]
    currencies: Currency[]
  }) {
  const initialState = { message: null, errors: {} };
  const createCreditCardExpenseItemWithId = createCreditCardExpenseItem.bind(null, creditCardId);

  const [state, dispatch] = useFormState(createCreditCardExpenseItemWithId, initialState);

  const [isRecurrent, setIsRecurrent] = useState(false)
  const [totalAmount, setTotalAmount] = useState(0)
  const [installmentsQuantity, setInstallmentsQuantity] = useState(1)

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit flex flex-col gap-4">

        <div>
          <label className="mb-2 block text-sm font-medium">
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
          <label className="mb-2 block text-sm font-medium">
            Seleccione con quien compartirá el gasto
          </label>
          <div>
            {
              !personsToShare.length ?
                (
                  <LinkButton href={`${PAGES_URL.SETTINGS.PERSON_TO_SHARE_EXPENSE}?callbackUrl=${PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(creditCardId)}`}>
                    <PlusCircleIcon className='w-5' />
                    Crear persona
                  </LinkButton>
                ) : (
                  <div className="flex flex-wrap gap-4" >

                    {
                      personsToShare.map(person =>

                        // <div key={person.id} className='flex items-center justify-center gap-x-1'>
                        //   <label
                        //     htmlFor={`sharedWith[${person.id}]`}
                        //     className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        //   >
                        //     <input type="checkbox" name="sharedWith" id={`sharedWith[${person.id}]`} value={person.id} />
                        //     {person.name}
                        //   </label>
                        // </div>

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
                )

            }

          </div>

        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            Seleccione tipo de moneda
          </label>
          <div>
            {
              <select
                name="currencyId"
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
              <InputNumberFormat name="amount" locales="es-AR" maximumFractionDigits={2} format='currency' currency='ARS' className='rounded-md w-full' onChange={(e) => setTotalAmount(removeCurrencyMaskFromInput(e.target.value))}
                id="amount" />
              {/* <input
                onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
                id="amount"
                onWheel={(e) => e.currentTarget.blur()}
                name="amount"
                type="number"
                step="0.01"
                className="peer pl-8 block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              /> */}
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
          <label className="mb-2 block text-sm font-medium">
            ¿Es un pago recurrente? (todos los meses)
          </label>
          <div>
            <RadioGroup name='recurrent' defaultValue="false" className='flex' onValueChange={(e) => setIsRecurrent(e === "true")}>
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
            <div
              id="recurrent-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
              {state.errors.recurrent.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>

        {
          !isRecurrent ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cantidad de cuotas
                </label>
                <div>

                  <select
                    name="installmentsQuantity"
                    aria-describedby="installmentsQuantity"
                    className='w-full rounded-md'
                    onChange={(e) => setInstallmentsQuantity(parseInt(e.target.value))}
                  >
                    {Array.from(Array(24)).map((_, index) => (
                      <option key={(index + 1)} value={(index + 1).toString()}>
                        {(index + 1)}
                      </option>
                    ))}
                  </select>



                </div>
                {state.errors?.installmentsQuantity ? (
                  <div
                    id="installmentsQuantity-error"
                    aria-live="polite"
                    className="mt-2 text-sm text-red-500"
                  >
                    {state.errors.installmentsQuantity.map((error: string) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Monto de cada cuota
                </label>
                <div className="relative mt-2 rounded-md">
                  <div className="relative">
                    <input disabled name="installmentsAmount" id="installmentsAmount" className='rounded-md w-full' value={formatCurrency(totalAmount / installmentsQuantity)}
                    />
                  </div>

                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cuotas pagadas
                </label>
                <div>

                  <select
                    name="installmentsPaid"
                    aria-describedby="installmentsPaid"
                    className='w-full rounded-md'
                  >
                    {Array.from(Array(24)).map((_, index) => (
                      <option key={(index)} value={(index).toString()}>
                        {(index)}
                      </option>
                    ))}
                  </select>
                </div>
                {state.errors?.installmentsPaid ? (
                  <div
                    id="installmentsPaid-error"
                    aria-live="polite"
                    className="mt-2 text-sm text-red-500"
                  >
                    {state.errors.installmentsPaid.map((error: string) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                ) : null}
              </div>



            </>
          ) : null
        }
        <div>
          <label className="mb-2 block text-sm font-medium">
            Comienzo del pago
          </label>
          <div>

            <input
              id="paymentBeginning"
              name="paymentBeginning"
              type="month"
              className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
            />
          </div>
          {state.errors?.paymentBeginning ? (
            <div
              id="paymentBeginning-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
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
            href={PAGES_URL.SETTINGS.BASE_PATH}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </Link>
          <Button type="submit">Guardar</Button>
        </div>
      </div>
    </form >
  );
}
