import { getServerSession } from 'next-auth'
import { nextAuthOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/ui/login-form'
import { Metadata } from 'next'
import { PAGES_URL } from '@/lib/routes'
import { getToday } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Bienvenidos | GastApp',
}

export default async function Page() {
  const session = await getServerSession(nextAuthOptions)
  if (session?.user.id) return redirect(`${PAGES_URL.DASHBOARD.BASE_PATH}?date=${getToday()}`)
  return (
    <main className="relative flex min-h-screen justify-center items-center p-6 bg-gray-800">
      <div className='flex flex-col text-center'>
        <h1 className=" text-3xl font-bold text-gray-200">
          Bienvenidos a
        </h1>
        <h1 className="animate-pulse text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500 text-shadow mb-5">
          GastApp
        </h1>
        <LoginForm />
      </div>
      <div className='absolute bottom-6 text-xs text-gray-400'>© 2024 Ricky Bruno. Todos los derechos reservados.</div>
    </main>
  )
}
