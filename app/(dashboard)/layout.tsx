import Navbar from '@/components/ui/dashboard/Navbar'
import { nextAuthOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import React from 'react'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(nextAuthOptions)

  return (
    <div className='relative min-h-[82vh]'>
      <Navbar session={session} />
      <div className='mx-auto mt-20'>{children}</div>
      <div className='w-full text-center absolute -bottom-[70px] text-xs text-gray-400'>© 2024 Ricky Bruno. Todos los derechos reservados.</div>
    </div>
  )
}
