import { Kanit } from 'next/font/google'

export const kanit = Kanit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kanit',
  display: 'swap',
  fallback: ['system-ui', 'arial']
})
