import { Metadata } from 'next';
import Form from './_components/create-form';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import CreditCardCreateForm from './_components/create-form';
import { fetchPaymentSource } from '@/services/payment-source';
import { fetchPaymentType } from '@/services/payment-type';

export const metadata: Metadata = {
  title: 'Crear Tarjeta de Crédito',
};

export default async function Page() {
  const paymentSources = await fetchPaymentSource();
  const paymentType = await fetchPaymentType();
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: '/dashboard/credit-cards' },
          {
            label: 'Crear Tarjeta de Crédito',
            href: '/dashboard/credit-cards/create',
            active: true,
          },
        ]}
      />
      <CreditCardCreateForm paymentSources={paymentSources} paymentTypes={paymentType} />
    </main>
  );
}