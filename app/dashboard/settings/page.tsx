import { fetchPaymentSource } from '@/services/payment-source';
import { fetchPaymentType } from '@/services/payment-type';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function Page() {

  const paymentTypes = await fetchPaymentType()
  const paymentSources = await fetchPaymentSource()
  return (
    <main className='flex gap-4 flex-wrap flex-col'>
      <section className='bg-white rounded-lg p-4 md:p-6'>
        <div className='flex justify-between gap-4 items-center'>
          <h1 className='text-xl'>Forma de pago</h1>
          <Link
            href="/dashboard/settings/payment-type/create"
            className="py-2 px-4 w-fit flex items-center rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="hidden md:block">Crear Forma de pago</span>
            <PlusIcon className="h-5 md:ml-4" />
          </Link>
        </div>
        {paymentTypes.length ? (
          paymentTypes.map(paymentType => (
            <p key={paymentType.id}>
              &bull; {paymentType.name}
            </p>
          ))
        ) :
          (<h2>No se crearon formas de pago</h2>)
        }
      </section>
      <section className='bg-white rounded-lg p-4 md:p-6'>
        <div className='flex justify-between gap-4 items-center'>
          <h1 className='text-xl'>Canales de pago</h1>
          <Link
            href="/dashboard/settings/payment-source/create"
            className="py-2 px-4 w-fit flex items-center rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span className="hidden md:block">Crear Canal de pago</span>
            <PlusIcon className="h-5 md:ml-4" />
          </Link>
        </div>
        {paymentSources.length ? (
          paymentSources.map(paymentSource => (
            <p key={paymentSource.id}>
              &bull; {paymentSource.name}
            </p>
          ))
        ) :
          (<h2>No se crearon canales de pago</h2>)
        }
      </section>
    </main>
  );
}
