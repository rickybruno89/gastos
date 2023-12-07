import Breadcrumbs from '@/components/ui/breadcrumbs'
import { fetchExpenses } from '@/services/expense'
import { PAGES_URL } from '@/lib/routes'
import { Metadata } from 'next'
import ExpensesTable from './_components/expenses-table'

export const metadata: Metadata = {
  title: 'Gastos',
}

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
        <ExpensesTable expenses={expenses} />
      </section>
    </main>
  )
}
