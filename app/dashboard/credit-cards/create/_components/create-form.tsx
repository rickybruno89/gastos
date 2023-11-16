'use client';

import Link from 'next/link';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useFormState } from 'react-dom';
import { createCreditCard } from '@/services/credit-card';
import { Button } from '@/components/ui/button';
import { PaymentSource, PaymentType } from '@prisma/client';

export default function CreditCardCreateForm({ paymentTypes, paymentSources }: { paymentTypes: PaymentType[], paymentSources: PaymentSource[] }) {
  const initialState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createCreditCard, initialState);
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
          <div className="relative">
            <select
              id="paymentType"
              name="paymentTypeId"
              className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="paymentType-error"
            >
              <option value="" disabled>
                Seleccione una opción
              </option>
              {paymentTypes.map((paymentType) => (
                <option key={paymentType.id} value={paymentType.id}>
                  {paymentType.name}
                </option>
              ))}
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
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
          <div className="relative">
            <select
              id="paymentSource"
              name="paymentSourceId"
              className="peer block w-full rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="paymentSource-error"
            >
              <option value="" disabled>
                Seleccione una opción
              </option>
              {paymentSources.map((paymentSource) => (
                <option key={paymentSource.id} value={paymentSource.id}>
                  {paymentSource.name}
                </option>
              ))}
            </select>
            <UserCircleIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500" />
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
            href="/dashboard/credit-cards"
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
