
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { PAGES_URL } from '@/lib/routes';
import { fetchCreditCards } from '@/services/credit-card';
import { PlusCircleIcon } from '@heroicons/react/20/solid';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
};

export default async function Page() {
  const creditCards = await fetchCreditCards()

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: PAGES_URL.CREDIT_CARDS.BASE_PATH, active: true }
        ]}
      />
      <div className='flex gap-4 flex-wrap justify-center md:justify-start'>
        {
          creditCards.map(creditCard => (
            <div key={creditCard.id} className='bg-red-700 w-full md:w-[350px] aspect-video rounded-xl shadow-xl p-4 text-white flex flex-col gap-4'>
              <h1 className='font-bold'>{creditCard.name}</h1>
              <div className='flex flex-1 flex-col gap-2 justify-between'>
                <div>
                  <p>Forma de pago: <span className='font-bold'>{creditCard.paymentType.name}</span></p>
                  <p>Canal de pago: <span className='font-bold'>{creditCard.paymentSource.name}</span></p>
                </div>
                <div className='flex justify-between items-end'>
                  <Link href={PAGES_URL.CREDIT_CARDS.SUMMARY.BASE_PATH("asdasdads")}>Mas información</Link>
                  <Link href={PAGES_URL.CREDIT_CARDS.SUMMARY.CREATE("asdadasdasd")}>Generar resumen</Link>
                </div>
              </div>
            </div>

          ))
        }

        <Link href={PAGES_URL.CREDIT_CARDS.CREATE} className='w-full md:w-[350px] aspect-video rounded-xl border border-dashed border-blue-400 flex justify-center items-center gap-4 text-blue-400 cursor-pointer'>
          <PlusCircleIcon className='w-12 ' />
          Agregar tarjeta
        </Link>
      </div>
    </main>
  );
}