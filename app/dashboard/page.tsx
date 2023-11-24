import { Metadata } from 'next';
import CreateSummaryForm from './_components/create-summary-form';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function Page() {

  return (
    <main>
      Bienvenido. Proximamente aqui estará el resumen de todo
      <CreateSummaryForm />
      {/* <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<CardsSkeleton />}>
          <CardWrapper />
        </Suspense>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        <Suspense fallback={<RevenueChartSkeleton />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<LatestInvoicesSkeleton />}>

          <LatestInvoices />
        </Suspense>
      </div> */}
    </main>
  );
}