import Breadcrumbs from '@/components/ui/breadcrumbs'
import PaymentTypeForm from '../../_components/PaymentTypeForm'
import { PAGES_URL } from '@/lib/routes';

export default function Page({
  searchParams,
}: {
  searchParams?: {
    callbackUrl?: string;
  };
}) {
  const callbackUrl = searchParams?.callbackUrl || PAGES_URL.SETTINGS.BASE_PATH;

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
      <PaymentTypeForm callbackUrl={callbackUrl} />
    </>

  )
}
