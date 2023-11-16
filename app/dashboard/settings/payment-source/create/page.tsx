import Breadcrumbs from '@/components/ui/breadcrumbs'
import PaymentSourceForm from '../../_components/PaymentSourceForm'

export default function page() {
  return (
    <>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Configuración', href: '/dashboard/settings' },
          {
            label: 'Crear Canal de Pago',
            href: '/dashboard/settings/payment-source/create',
            active: true,
          },
        ]}
      />
      <PaymentSourceForm />
    </>

  )
}
