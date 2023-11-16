
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gastos',
};

export default async function Page() {
  // const data = await fetchCreditCards()
  // console.log("🚀 ~ file: page.tsx:12 ~ Page ~ data:", data)

  return (
    <main className=''>
      <h1 className='text-xl mb-4'>Gastos</h1>
    </main>
  );
}