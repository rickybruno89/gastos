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
          { label: 'Configuración', href: PAGES_URL.SETTINGS.BASE_PATH },
          {
            label: 'Nueva forma de pago',
            href: PAGES_URL.SETTINGS.PAYMENT_TYPE_CREATE,
            active: true,
          },
        ]}
      />
      <PaymentTypeForm callbackUrl={callbackUrl} />
    </>

  )
}
