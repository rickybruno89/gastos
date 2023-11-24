"use client"
import { Button } from '@/components/ui/button';
import { createSummaryForMonth } from '@/services/summary';
import React from 'react'
import { useFormState } from 'react-dom';

export default function CreateSummaryForm() {
  const initialState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createSummaryForMonth, initialState);

  return (
    <form action={dispatch}>
      <div>
        <label className="mb-2 block text-sm font-medium">
          Comienzo del pago
        </label>
        <div>
          <input
            id="date"
            name="date"
            type="month"
            className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
          />
        </div>
        {state.errors?.date ? (
          <div
            id="date-error"
            aria-live="polite"
            className="mt-2 text-sm text-red-500"
          >
            {state.errors.date.map((error: string) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
      </div>
      <Button type="submit">Guardar</Button>
    </form>
  )
}
