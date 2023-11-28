
import Breadcrumbs from '@/components/ui/breadcrumbs';
import LinkButton from '@/components/ui/link-button';
import { PAGES_URL } from '@/lib/routes';
import { formatCurrency } from '@/lib/utils';
import { fetchExpenses } from '@/services/expense';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gastos',
};

export default async function Page() {
  const expenses = await fetchExpenses()

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          {
            label: `Gastos`,
            href: PAGES_URL.EXPENSES.BASE_PATH,
            active: true,
          },
        ]}
      />
      <section>
        <div className='flex gap-4 items-center mb-2'>
          <h1 className='text-xl font-bold'>Items</h1>
          <LinkButton href={PAGES_URL.EXPENSES.CREATE}>
            <PlusIcon className='w-5' />
            Agregar
          </LinkButton>
        </div>
        <div className='flex flex-col gap-4'>
          {
            expenses.length ? (
              expenses.map(item => (
                <div key={item.id} className="relative rounded-md bg-gray-50 shadow-md ">
                  <div className='p-4 md:p-6'>
                    <span className='font-bold'>{item.description} - {formatCurrency(item.amount)}</span>
                    {
                      item.sharedWith.length ? (<p>Compartido con <span className='font-bold'>{item.sharedWith.map(person => person.name).join(" - ")}</span> </p>) : null
                    }
                    <p>Notas: <span className='font-bold'>{item.notes}</span> </p>
                  </div>
                </div>)
              )) : (<h1>No hay items </h1>)
          }
        </div>

      </section>
    </main>
  );
}