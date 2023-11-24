import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes';
import { Metadata } from 'next';
import React from 'react'
import ExpenseCreateForm from './_components/create-form';
import { fetchPersonToShare } from '@/services/settings/person-to-share-expense';
import { fetchCurrency } from '@/services/settings/currency';
import { fetchPaymentSource } from '@/services/settings/payment-source';
import { fetchPaymentType } from '@/services/settings/payment-type';

export const metadata: Metadata = {
  title: 'Nuevo Item',
};

export default async function Page() {

  const personsToShare = await fetchPersonToShare()
  const currencies = await fetchCurrency()
  const paymentSources = await fetchPaymentSource();
  const paymentType = await fetchPaymentType();

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Gastos`,
            href: PAGES_URL.EXPENSES.BASE_PATH,
            active: false,
          },
          {
            label: `Nuevo gasto`,
            href: PAGES_URL.EXPENSES.CREATE,
            active: true,
          },
        ]}
      />
      <ExpenseCreateForm personsToShare={personsToShare} currencies={currencies} paymentSources={paymentSources} paymentTypes={paymentType} />
    </main>
  )
}
