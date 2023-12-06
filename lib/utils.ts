import { Decimal } from '@prisma/client/runtime/library'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import crypto from 'crypto-js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number | Decimal) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount as number)

export const removeCurrencyMaskFromInput = (amount: string) =>
  parseFloat(amount.replace('$', '').replace(/\./g, '').replace(',', '.'))

export const formatLocaleDate = (date: string) => {
  const [year, month] = date.split('-')
  const adjustedDate = new Date(`${year}-${month}-01T00:00:00`)

  return adjustedDate.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
  })
}

export const formatLocaleDueDate = (date: string) => {
  const [year, month, day] = date.split('-')
  const adjustedDate = new Date(`${year}-${month}-${day}T00:00:00`)

  return adjustedDate.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const getToday = () => {
  const now = new Date()
  const year = now.getFullYear()
  let month = now.getMonth() + 1

  const formattedMonth = month < 10 ? `0${month}` : `${month}`

  return `${year}-${formattedMonth}`
}

export const getNextMonthDate = () => {
  let now = new Date()
  now.setMonth(now.getMonth() + 1)
  let year = now.getFullYear()
  let month = now.getMonth() + 1

  const formattedMonth = month < 10 ? `0${month}` : `${month}`

  return `${year}-${formattedMonth}`
}

export const encryptString = (string: string) => crypto.AES.encrypt(string, process.env.CRYPTO_SECRET!).toString()

export const decryptString = (string: string) => {
  const bytes = crypto.AES.decrypt(string, process.env.CRYPTO_SECRET!)
  return bytes.toString(crypto.enc.Utf8)
}
