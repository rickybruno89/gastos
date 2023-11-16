import Breadcrumbs from '@/components/ui/breadcrumbs'
import PaymentSourceForm from '../../_components/PaymentSourceForm'
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
    <main>
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
      <PaymentSourceForm callbackUrl={callbackUrl} />
    </main>

  )
}
