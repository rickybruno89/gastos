"use client"
import { PowerIcon } from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button onClick={async () => {
      await signOut({
        callbackUrl: "/",
      })
    }} className="flex h-[48px] grow items-center !mt-0 justify-center gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:p-2 md:px-3">
      <PowerIcon className="w-6" />
      <div className="hidden md:block">Cerrar sesión</div>
    </button>
  )
}
