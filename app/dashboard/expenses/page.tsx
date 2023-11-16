
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { PAGES_URL } from '@/lib/routes';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gastos',
};

export default async function Page() {
  // const data = await fetchCreditCards()
  // console.log("🚀 ~ file: page.tsx:12 ~ Page ~ data:", data)

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

    </main>
  );
}