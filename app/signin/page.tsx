import { ArrowRightIcon } from '@heroicons/react/24/outline';

import Link from 'next/link';
import Image from 'next/image'
import AcmeLogo from '@/components/ui/acme-logo';
import { lusitana } from '@/components/ui/fonts';
import ButtonSig from './buttonSig';

export default function Page() {

  return (
    <main className="flex min-h-screen flex-col p-6">
      sigin perra
      <div className="flex items-center justify-center p-6 md:w-3/5 md:px-28 md:py-12">
        <ButtonSig />
      </div>
    </main >
  );
}
