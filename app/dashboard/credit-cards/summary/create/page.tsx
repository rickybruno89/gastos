import Breadcrumbs from '@/components/ui/breadcrumbs'
import React from 'react'

export default function Page() {
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Tarjetas de crédito', href: '/dashboard/credit-cards' },
          {
            label: 'Resúmenes',
            href: '/dashboard/credit-cards/summary',
          },
          {
            label: 'Crear',
            href: '/dashboard/credit-cards/summary/create',
            active: true,
          },
        ]}
      />
    </main>
  )
}
