import { Inter, Kanit, Lusitana, Roboto } from 'next/font/google'
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
export const lusitana = Lusitana({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-lusitana',
})
export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-roboto',
})
export const kanit = Kanit({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-kanit',
})
