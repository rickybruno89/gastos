'use client';

import Link from 'next/link';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusCircleIcon,
  PlusIcon,
  ReceiptPercentIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useFormState } from 'react-dom';
import { createCreditCard } from '@/services/credit-card';
import { Button } from '@/components/ui/button';
import { PaymentSource, PaymentType } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAGES_URL } from '@/lib/routes';

export default function CreditCardCreateForm({ paymentTypes, paymentSources }: { paymentTypes: PaymentType[], paymentSources: PaymentSource[] }) {
  const initialState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createCreditCard, initialState);
  const router = useRouter()
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
                id="creditCardName"
                name="creditCardName"
                type="text"
                placeholder="Galicia - Visa"
                aria-describedby="creditCardName-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
            {state.errors?.creditCardName ? (
              <div
                id="creditCardName-error"
                aria-live="polite"
                className="mt-2 text-sm text-red-500"
              >
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
                id="taxesPercent"
                name="taxesPercent"
                type="number"
                step="0.01"
                placeholder="Ej: 1"
                className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
              />
              <div className="pointer-events-none absolute py-[7px] top-0 right-3 text-black peer-focus:text-gray-900">%</div>
            </div>
            {state.errors?.taxesPercent ? (
              <div
                id="creditCardName-error"
                aria-live="polite"
                className="mt-2 text-sm text-red-500"
              >
                {state.errors.taxesPercent.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="paymentType" className="mb-2 block text-sm font-medium">
            Seleccione la forma de pago a usar
          </label>
          <div>
            <Select onValueChange={(value) => {
              if (value.includes("/dashboard"))
                router.push(value)
            }}
              name="paymentTypeId"
              aria-describedby="paymentType-error"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className='bg-blue-500 focus:bg-blue-400 cursor-pointer text-white focus:text-white' value={`${PAGES_URL.SETTINGS.PAYMENT_TYPE_CREATE}?callbackUrl=${PAGES_URL.CREDIT_CARDS.CREATE}`}>
                  <div className='flex gap-2 p-1'>
                    <PlusCircleIcon className='w-5' />
                    Crear nueva forma de pago
                  </div>
                </SelectItem>
                {paymentTypes.map((paymentType) => (
                  <SelectItem key={paymentType.id} value={paymentType.id}>
                    {paymentType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <label htmlFor="paymentSource" className="mb-2 block text-sm font-medium">
            Seleccione un canal de pago
          </label>
          <div>
            <Select onValueChange={(value) => {
              if (value.includes("/dashboard"))
                router.push(value)
            }}
              name="paymentSourceId"
              aria-describedby="paymentSource-error"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una opción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem className='bg-blue-500 focus:bg-blue-400 cursor-pointer text-white focus:text-white' value={`${PAGES_URL.SETTINGS.PAYMENT_SOURCE_CREATE}?callbackUrl=${PAGES_URL.CREDIT_CARDS.CREATE}`}>
                  <div className='flex gap-2 p-1'>
                    <PlusCircleIcon className='w-5' />
                    Crear nuevo canal de pago
                  </div>
                </SelectItem>
                {paymentSources.map((paymentSource) => (
                  <SelectItem key={paymentSource.id} value={paymentSource.id}>
                    {paymentSource.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state.errors?.paymentSourceId ? (
            <div
              id="customer-error"
              aria-live="polite"
              className="mt-2 text-sm text-red-500"
            >
              {state.errors.paymentSourceId.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.CREDIT_CARDS.BASE_PATH}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancel
          </Link>
          <Button type="submit">Crear Tarjeta de Crédito</Button>
        </div>
      </div>

    </form>
  );
}
