import NavLinks from '@/components/ui/dashboard/nav-links'
import Image from 'next/image'
import { getServerSession } from 'next-auth'
import SignOutButton from './sign-out-button'
import { nextAuthOptions } from '@/lib/auth'

export default async function SideNav() {
  const session = await getServerSession(nextAuthOptions)

  return (
    <div className="flex h-full flex-col px-3 py-2 md:px-2">
      <div className="mb-2 flex h-20 flex-row md:flex-col items-center justify-center rounded-md bg-blue-600 p-4 md:h-40 gap-4">
        <span className="text-white">¡Hola!, {session?.user?.name}</span>
        <div className="rounded-full overflow-hidden w-16 h-16">
          <Image priority width={100} height={100} src={session?.user?.image as string} alt="profile picture" />
        </div>
      </div>
      <div className="flex grow flex-row justify-between gap-2 md:flex-col md:space-x-0 md:space-y-2 flex-wrap">
        <NavLinks />
        <div className="hidden !mt-0 h-auto w-full grow rounded-md bg-gray-50 md:block"></div>
        <SignOutButton />
      </div>
    </div>
  )
}
