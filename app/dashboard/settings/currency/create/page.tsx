import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes';
import CurrencyForm from '../../_components/CurrencyForm';

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
            label: 'Nueva moneda',
            href: PAGES_URL.SETTINGS.CURRENCY_CREATE,
            active: true,
          },
        ]}
      />
      <CurrencyForm callbackUrl={callbackUrl} />
    </main>

  )
}
