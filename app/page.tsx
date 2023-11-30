import AcmeLogo from '@/components/ui/acme-logo'
import { lusitana } from '@/components/ui/fonts'
import { getServerSession } from 'next-auth'
import { nextAuthOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginForm from '@/components/ui/login-form'
import { Metadata } from 'next'
import { PAGES_URL } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Login',
}

export default async function Page() {
  const session = await getServerSession(nextAuthOptions)
  if (session?.user.id) return redirect(PAGES_URL.DASHBOARD.BASE_PATH)
  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="flex h-20 shrink-0 items-end rounded-lg bg-blue-500 p-4 md:h-52">
        <h1 className="font-bold text-white text-4xl">Bienvenido a Gastos</h1>
      </div>
      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        <div className="flex flex-col justify-center gap-6 rounded-lg bg-gray-50 px-6 py-10 md:w-2/5 md:px-20">
          <p className={`text-xl text-gray-800 md:text-3xl md:leading-normal ${lusitana.className}`}>
            <strong>Controla tus gastos fijos y tarjetas de créditos mensualmente</strong>
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
