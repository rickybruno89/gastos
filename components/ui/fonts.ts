import { Inter, Lusitana, Roboto } from 'next/font/google'
export const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
export const lusitana = Lusitana({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-lusitana'
})
export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-roboto',
})
