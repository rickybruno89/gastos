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
          { label: 'Configuración', href: PAGES_URL.SETTINGS.BASE_PATH },
          {
            label: 'Nuevo canal de pago',
            href: PAGES_URL.SETTINGS.PAYMENT_SOURCE_CREATE,
            active: true,
          },
        ]}
      />
      <PaymentSourceForm callbackUrl={callbackUrl} />
    </main>

  )
}
