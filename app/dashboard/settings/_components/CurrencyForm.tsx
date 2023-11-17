'use client';

import { Button } from '@/components/ui/button';
import { PAGES_URL } from '@/lib/routes';
import { createCurrency } from '@/services/settings/currency';
import Link from 'next/link';
import { useFormState } from 'react-dom';

export default function CurrencyForm({ callbackUrl }: { callbackUrl: string }) {
  const initialState = { message: null, errors: {} };
  const createCurrencyWithCallbackUrl = createCurrency.bind(null, callbackUrl);

  const [state, dispatch] = useFormState(createCurrencyWithCallbackUrl, initialState);

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit">
        <div className="mb-4">
          <label htmlFor="currency_name" className="mb-2 block text-sm font-medium">
            Nombre
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative w-52">
              <input
                id="currency_name"
                name="currency_name"
                type="text"
                aria-describedby="currency_name-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
            {state.errors?.currency_name ? (
              <div
                id="currency_name-error"
                aria-live="polite"
                className="mt-2 text-sm text-red-500"
              >
                {state.errors.currency_name.map((error: string) => (
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
            Cancelar
          </Link>
          <Button type="submit">Crear moneda</Button>
        </div>
      </div>

    </form>
  );
}
