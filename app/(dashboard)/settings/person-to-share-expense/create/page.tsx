import Breadcrumbs from '@/components/ui/breadcrumbs'
import { PAGES_URL } from '@/lib/routes';
import PersonToShareForm from '../../_components/PersonToShareForm';

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
            label: 'Nueva persona',
            href: PAGES_URL.SETTINGS.PERSON_TO_SHARE_EXPENSE,
            active: true,
          },
        ]}
      />
      <PersonToShareForm callbackUrl={callbackUrl} />
    </main>

  )
}
