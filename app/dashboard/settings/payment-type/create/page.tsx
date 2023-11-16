import Breadcrumbs from '@/components/ui/breadcrumbs'
import PaymentTypeForm from '../../_components/PaymentTypeForm'

export default function page() {
  return (
    <>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Configuración', href: '/dashboard/settings' },
          {
            label: 'Crear Forma de Pago',
            href: '/dashboard/settings/payment-type/create',
            active: true,
          },
        ]}
      />
      <PaymentTypeForm />
    </>

  )
}
