'use client';

import { Button } from '@/components/ui/button';
import { PAGES_URL } from '@/lib/routes';
import { createCreditCardExpenseItem } from '@/services/credit-card';
import { CurrencyDollarIcon } from '@heroicons/react/20/solid';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { formatCurrency } from '@/lib/utils';

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
  const [installmentsQuantity, setInstallmentsQuantity] = useState(0)
  console.log(totalAmount)

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit flex flex-col gap-4">

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
                ) :
                (
                  <ToggleGroup type="multiple">
                    {
                      personsToShare.map(person =>
                        <ToggleGroupItem key={person.id} value={person.id} aria-label="Toggle bold" className=' data-[state=on]:bg-blue-200'>
                          {person.name}
                        </ToggleGroupItem>)
                    }
                  </ToggleGroup>
                )
            }

          </div>
          {state.errors?.sharedWith ? (
            <div
              id="customer-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
              {state.errors.sharedWith.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            Seleccione tipo de moneda
          </label>
          <div>
            {
              !currencies.length ?
                (
                  <LinkButton href={`${PAGES_URL.SETTINGS.CURRENCY_CREATE}?callbackUrl=${PAGES_URL.CREDIT_CARDS.EXPENSE_ITEM.CREATE(creditCardId)}`}>
                    <PlusCircleIcon className='w-5' />
                    Crear moneda
                  </LinkButton>
                ) : (
                  <Select
                    name="currencyId"
                    aria-describedby="currencyId"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una opción" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
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
              <input
                onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                className="peer pl-8 block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              />
              <CurrencyDollarIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
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
            <RadioGroup defaultValue="false" className='flex' onValueChange={(e) => setIsRecurrent(e === "true")}>
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
          !isRecurrent ? (<div>
            <label className="mb-2 block text-sm font-medium">
              Cantidad de cuotas
            </label>
            <div>
              <Select
                name="installmentsQuantity"
                aria-describedby="installmentsQuantity"
                onValueChange={(e) => setInstallmentsQuantity(parseInt(e))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(Array(24)).map((_, index) => (
                    <SelectItem key={(index + 1)} value={(index + 1).toString()}>
                      {(index + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
          </div>) : null
        }
        {
          installmentsQuantity ? (<div>
            <label htmlFor="amount" className="mb-2 block text-sm font-medium">

              Monto de cada cuota {formatCurrency(totalAmount / installmentsQuantity)}
            </label>

          </div>
          ) : null
        }







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
                aria-describedby="name-error"
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
          <Button type="submit">Crear Canal de pago</Button>
        </div>
      </div>
    </form>
  );
}
