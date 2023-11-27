'use client';

import { Button } from '@/components/ui/button';
import { PAGES_URL } from '@/lib/routes';
import Link from 'next/link';
import { useFormState } from 'react-dom';
import { Checkbox } from "@/components/ui/checkbox"
import { createSummaryForCreditCard } from '@/services/summary';
import { PaymentSource, PaymentType, Prisma } from '@prisma/client';
import { formatCurrency, getToday } from '@/lib/utils';
import { useState } from 'react';

type CreditCardWithItems = Prisma.CreditCardGetPayload<{
  include: {
    creditCardExpenseItems: {
      include: {
        sharedWith: true
      }
    },
    paymentSource: true,
    paymentType: true,
    paymentSummaries: true
  }
}>


export default function SummaryCreateForm({
  creditCard,
  paymentTypes,
  paymentSources }:
  {
    creditCard: CreditCardWithItems,
    paymentTypes: PaymentType[]
    paymentSources: PaymentSource[]
  }) {
  const initialState = { message: null, errors: {} };
  const createSummaryForCreditCardWithId = createSummaryForCreditCard.bind(null, creditCard.id);

  const [state, dispatch] = useFormState(createSummaryForCreditCardWithId, initialState);
  const [selectedItems, setSelectedItems] = useState(creditCard.creditCardExpenseItems.map(item => ({ ...item, checked: true })))

  const handleItemChecked = (checked: boolean, id: string) => {
    const newSelectedItems = selectedItems.map(item => {
      if (item.id === id) return { ...item, checked }
      return item
    })
    setSelectedItems(newSelectedItems)
  }

  const getTotal = () => {
    const total = selectedItems.reduce((total, item) => {
      if (item.checked) {
        if (item.recurrent) return total += item.amount
        return total += item.installmentsAmount
      }
      return total
    }, 0)
    return formatCurrency(total)
  }

  return (
    <form action={dispatch}>
      <div className="rounded-md bg-gray-50 p-4 md:p-6 w-full md:w-fit flex flex-col gap-4">
        <div>
          <label htmlFor="paymentTypeId" className="mb-2 block text-sm font-medium">
            Seleccione la forma de pago a usar
          </label>
          <div>
            <select
              name="paymentTypeId"
              id="paymentTypeId"
              aria-describedby="paymentTypeId"
              className='w-full rounded-md'
              defaultValue={creditCard.paymentTypeId}
            >
              {paymentTypes.map((paymentType) => (
                <option key={paymentType.id} value={paymentType.id} >
                  {paymentType.name}
                </option>
              ))}
            </select>
          </div>
          {state.errors?.paymentTypeId ? (
            <div
              id="paymentTypeId-error"
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
            <select
              name="paymentSourceId"
              id="paymentSourceId"
              aria-describedby="paymentSourceId"
              className='w-full rounded-md'
              defaultValue={creditCard.paymentSourceId}
            >
              {paymentSources.map((paymentSource) => (
                <option key={paymentSource.id} value={paymentSource.id} >
                  {paymentSource.name}
                </option>
              ))}
            </select>
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
          <label className="mb-2 block text-sm font-medium" htmlFor='date'>
            Comienzo del pago
          </label>
          <div>
            <input
              id="date"
              defaultValue={getToday()}
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

        <div className='flex flex-col gap-4'>
          <p className="mb-2 block text-sm font-medium">
            Seleccione los items a pagar
          </p>
          <div>
            <div className="flex flex-col gap-4" >
              {
                selectedItems.map(item =>
                  <div key={item.id} className='flex items-center justify-end gap-x-1'>
                    <label
                      htmlFor={`creditCardExpenseItemIds[${item.id}]`}
                      className="flex flex-wrap gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <span className='font-bold'>{item.description}</span>
                      <span>-</span>
                      {
                        !item.recurrent ? (<span>Cuota {item.installmentsPaid + 1} de {item.installmentsQuantity} - {formatCurrency(item.installmentsAmount)}</span>) : (
                          <span>{formatCurrency(item.amount)}</span>
                        )
                      }
                    </label>
                    <Checkbox className="ml-4" id={`creditCardExpenseItemIds[${item.id}]`} name="creditCardExpenseItemIds" value={item.id} checked={item.checked} onCheckedChange={(e) => handleItemChecked(e as boolean, item.id)} />
                  </div>
                )
              }
              {state.errors?.creditCardExpenseItemIds ? (
                <div
                  id="creditCardExpenseItemIds-error"
                  aria-live="polite"
                  className="mt-2 text-sm text-red-500"
                >
                  {state.errors.creditCardExpenseItemIds.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <p className='font-bold text-right'>Total: <span>{getTotal()}</span></p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-4">
          <Link
            href={PAGES_URL.CREDIT_CARDS.DETAILS(creditCard.id)}
            className="flex h-10 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Cancelar
          </Link>
          <Button type="submit">Generar resumen</Button>
        </div>
      </div>
    </form >
  );
}
