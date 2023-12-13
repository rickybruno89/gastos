import '@/app/globals.css'

import { Metadata } from 'next'
import { NextAuthProvider } from './Providers'
import { inter } from '@/components/ui/fonts'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: {
    template: '%s | GastApp',
    default: 'Inicio',
  },
  description: 'Lleva la cuenta de tus obligaciones mensuales',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon.png',
  },
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-100`}>
        <NextAuthProvider>{children}</NextAuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
