import Navbar from '@/components/ui/dashboard/Navbar'
import { nextAuthOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import React from 'react'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(nextAuthOptions)

  return (
    <div>
      <Navbar session={session} />
      <div>{children}</div>
    </div>
  )
}
