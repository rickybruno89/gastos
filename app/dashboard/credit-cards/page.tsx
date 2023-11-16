
import { fetchCreditCards } from '@/lib/data';
import { PlusCircleIcon } from '@heroicons/react/20/solid';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tarjeta de Crédito',
};

export default async function Page() {
  const data = await fetchCreditCards()
  console.log("🚀 ~ file: page.tsx:12 ~ Page ~ data:", data)

  return (
    <main className=''>
      <h1 className='text-xl mb-4'>Tarjetas de crédito</h1>
      <div className='flex gap-4 flex-wrap justify-center md:justify-start'>

        <div className='bg-red-700 w-[300px] aspect-video rounded-xl shadow-xl'></div>
        <Link href={"/dashboard/credit-card/create"} className=' w-[300px] aspect-video rounded-xl border border-dashed border-blue-400 flex justify-center items-center gap-4 text-blue-400 cursor-pointer'>
          <PlusCircleIcon className='w-12 ' />
          Agregar tarjeta
        </Link>
      </div>
    </main>
  );
}