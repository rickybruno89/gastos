import Breadcrumbs from '@/components/ui/breadcrumbs';
import LinkButton from '@/components/ui/link-button';
import { PAGES_URL } from '@/lib/routes';
import { fetchCurrency } from '@/services/settings/currency';
import { fetchPaymentSource } from '@/services/settings/payment-source';
import { fetchPaymentType } from '@/services/settings/payment-type';
import { fetchPersonToShare } from '@/services/settings/person-to-share-expense';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Configuración',
};

export default async function Page() {

  const paymentTypes = await fetchPaymentType()
  const paymentSources = await fetchPaymentSource()
  const personToShareExpenses = await fetchPersonToShare()
  const currencies = await fetchCurrency()

  return (
    <main className='flex gap-4 flex-wrap flex-col'>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Configuración`,
            href: PAGES_URL.SETTINGS.BASE_PATH,
            active: true,
          },
        ]}
      />
      <section className='bg-white rounded-lg p-4 md:p-6'>
        <div className='flex justify-between gap-4 items-center'>
          <h1 className='text-xl'>Forma de pago</h1>
          <LinkButton
            href={PAGES_URL.SETTINGS.PAYMENT_TYPE_CREATE}
          >
            <PlusIcon className="h-5 " />
            <span className="hidden md:block">Crear Forma de pago</span>
          </LinkButton>
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
          <LinkButton
            href={PAGES_URL.SETTINGS.PAYMENT_SOURCE_CREATE}
          >
            <PlusIcon className="h-5" />
            <span className="hidden md:block">Crear Canal de pago</span>
          </LinkButton>
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

      <section className='bg-white rounded-lg p-4 md:p-6'>
        <div className='flex justify-between gap-4 items-center'>
          <h1 className='text-xl'>Personas para compartir gastos</h1>
          <LinkButton
            href={PAGES_URL.SETTINGS.PERSON_TO_SHARE_EXPENSE}
          >
            <PlusIcon className="h-5" />
            <span className="hidden md:block">Crear persona</span>
          </LinkButton>
        </div>
        {personToShareExpenses.length ? (
          personToShareExpenses.map(person => (
            <p key={person.id}>
              &bull; {person.name}
            </p>
          ))
        ) :
          (<h2>No se crearon personas</h2>)
        }
      </section>

      <section className='bg-white rounded-lg p-4 md:p-6'>
        <div className='flex justify-between gap-4 items-center'>
          <h1 className='text-xl'>Tipo de monedas a usar</h1>

        </div>
        {currencies.map(currency => (
          <p key={currency.id}>
            &bull; {currency.name}
          </p>
        ))}
      </section>
    </main>
  );
}
