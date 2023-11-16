'use client';

import { Button } from '@/components/ui/button';
import { PAGES_URL } from '@/lib/routes';
import { createCreditCardExpenseItem } from '@/services/credit-card';
import { CurrencyDollarIcon } from '@heroicons/react/20/solid';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';

export default function CreditCardExpenseItemCreateForm({ creditCardExpenseId }: { creditCardExpenseId: string }) {
  const initialState = { message: null, errors: {} };
  const router = useRouter()
  const createCreditCardExpenseItemWithId = createCreditCardExpenseItem.bind(null, creditCardExpenseId);

  const [state, dispatch] = useFormState(createCreditCardExpenseItemWithId, initialState);

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit flex flex-col gap-4">

        <div>
          <label htmlFor="sharedWith" className="mb-2 block text-sm font-medium">
            Seleccione con quien compartirá el gasto
          </label>
          <div>
            <Select
              onValueChange={(value) => {
                if (value.includes("/dashboard"))
                  router.push(value)
              }}
              name="sharedWith"
              aria-describedby="sharedWith-error"

            >
              <SelectTrigger>
                <SelectValue placeholder="Con nadie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className='bg-blue-500 focus:bg-blue-400 cursor-pointer text-white focus:text-white' value={`${PAGES_URL.SETTINGS.PAYMENT_TYPE_CREATE}?callbackUrl=${PAGES_URL.CREDIT_CARDS.CREATE}`}>
                  <div className='flex gap-2 p-1'>
                    <PlusCircleIcon className='w-5' />
                    Crear nueva persona
                  </div>
                  <SelectItem value="0" aria-selected>Con nadie</SelectItem>
                </SelectItem>
                {/* {paymentTypes.map((paymentType) => (
                  <SelectItem key={paymentType.id} value={paymentType.id}>
                    {paymentType.name}
                  </SelectItem>
                ))} */}
              </SelectContent>
            </Select>
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
          <label htmlFor="currencyId" className="mb-2 block text-sm font-medium">
            Seleccione una moneda
          </label>
          <div>
            <Select
              onValueChange={(value) => {
                if (value.includes("/dashboard"))
                  router.push(value)
              }}
              name="currencyId"
              aria-describedby="currencyId-error"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className='bg-blue-500 focus:bg-blue-400 cursor-pointer text-white focus:text-white' value={`${PAGES_URL.SETTINGS.PAYMENT_TYPE_CREATE}?callbackUrl=${PAGES_URL.CREDIT_CARDS.CREATE}`}>
                  <div className='flex gap-2 p-1'>
                    <PlusCircleIcon className='w-5' />
                    Crear nueva moneda
                  </div>
                </SelectItem>
                {/* {paymentTypes.map((paymentType) => (
                  <SelectItem key={paymentType.id} value={paymentType.id}>
                    {paymentType.name}
                  </SelectItem>
                ))} */}
              </SelectContent>
            </Select>
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
          <label htmlFor="description" className="mb-2 block text-sm font-medium">
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
        <div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">
            Monto total
          </label>
          <div className="relative rounded-md">
            <div className="relative ">
              <input
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
