
import { fetchCreditCards } from '@/lib/data';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';

export const metadata: Metadata = {
  title: 'Tarjeta Crédito',
};

export default async function Page() {
  const data = await fetchCreditCards()

  return (
    <main className=''>
      <h1 className='text-xl mb-4'>Tarjetas de crédito</h1>
      <div className='bg-red-700 w-[300px] aspect-video rounded-xl shadow-xl'></div>
    </main>
  );
}