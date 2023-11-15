import SideNav from '@/components/ui/dashboard/sidenav'
import React from 'react'

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
      <div className="w-full flex-none md:w-64">
        <SideNav />
      </div>
      <div className="flex-grow p-4 md:overflow-y-auto md:p-6">{children}</div>
    </div>
  )
}