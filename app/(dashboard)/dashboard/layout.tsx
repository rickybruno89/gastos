import SideNav from '@/components/ui/dashboard/sidenav'
import { nextAuthOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import React from 'react'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(nextAuthOptions)
  if (!session?.user.id) return redirect('/')

  return <div className="flex-grow p-4 md:overflow-y-auto md:p-6">asd{children}</div>
}
