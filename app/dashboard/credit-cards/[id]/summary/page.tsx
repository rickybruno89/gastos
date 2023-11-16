import Breadcrumbs from '@/components/ui/breadcrumbs'
import React from 'react'

export default function Page({ params }: { params: { id: string } }) {
  console.log(params.id);

  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: '/dashboard/credit-cards' },
          {
            label: 'Resúmenes',
            href: '/dashboard/credit-cards/summary',
            active: true,
          },
        ]}
      />
    </main>
  )
}
