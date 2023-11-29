'use client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createCurrency } from '@/services/settings/currency'
import Link from 'next/link'
import { useFormState } from 'react-dom'

export default function CurrencyCreateForm({ callbackUrl }: { callbackUrl: string }) {
  const initialState = { message: null, errors: {} }
  const createCurrencyWithCallbackUrl = createCurrency.bind(null, callbackUrl)

  const [state, dispatch] = useFormState(createCurrencyWithCallbackUrl, initialState)

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-fit">
        <div className="mb-4">
          <label htmlFor="name" className="mb-2 block text-sm font-medium">
            Nombre
          </label>
          <div className="relative mt-2 rounded-md">
            <div className="relative w-52">
              <input
                id="name"
                name="name"
                type="text"
                aria-describedby="name-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
              />
            </div>
            {state.errors?.name ? (
              <div id="name-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                {state.errors.name.map((error: string) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Usar como moneda por defecto</label>
          <div>
            <RadioGroup name="useAsDefault" defaultValue="false" className="flex">
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
          {state.errors?.useAsDefault ? (
            <div id="useAsDefault-error" aria-live="polite" className="mt-2 text-sm text-red-500">
              {state.errors.useAsDefault.map((error: string) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={callbackUrl}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>
          <Button type="submit">Crear</Button>
        </div>
      </div>
    </form>
  )
}
