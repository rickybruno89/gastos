import { Decimal } from '@prisma/client/runtime/library'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import crypto from 'crypto-js'
import { PaymentChannel } from '@prisma/client'

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

export const getTodayYear = () => getToday().split('-')[0]

export const getTodayInvoice = () => {
  const now = new Date()
  const year = now.getFullYear()
  let month = now.getMonth() + 1
  let day = now.getDate()
  const formattedDay = day < 10 ? `0${day}` : `${day}`
  const formattedMonth = month < 10 ? `0${month}` : `${month}`

  return `${formattedMonth}/${formattedDay}/${year}`
}

export const getTodayDueDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  let month = now.getMonth() + 1
  let day = now.getDate()
  const formattedDay = day < 10 ? `0${day}` : `${day}`
  const formattedMonth = month < 10 ? `0${month}` : `${month}`

  return `${year}-${formattedMonth}-${formattedDay}`
}
export const getDueDatePlusOneDay = () => {
  const now = new Date()
  now.setDate(now.getDate() + 1)
  const year = now.getFullYear()
  let month = now.getMonth() + 1
  let day = now.getDate()
  const formattedDay = day < 10 ? `0${day}` : `${day}`
  const formattedMonth = month < 10 ? `0${month}` : `${month}`

  return `${year}-${formattedMonth}-${formattedDay}`
}

export const getNextMonthDate = () => {
  let now = new Date()
  now.setMonth(now.getMonth() + 1)
  let year = now.getFullYear()
  let month = now.getMonth() + 1

  const formattedMonth = month < 10 ? `0${month}` : `${month}`

  return `${year}-${formattedMonth}`
}

export const getNextMonthDueDate = (itemDate: string | null, date: string) => {
  if (!itemDate) return null
  const [, , dd] = itemDate.split('-')
  const [yyyy, mm] = date.split('-')
  const adjustedDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`)

  let year = adjustedDate.getFullYear()
  let month = adjustedDate.getMonth() + 1
  let day = adjustedDate.getDate()

  const formattedMonth = month < 10 ? `0${month}` : `${month}`
  const formattedDay = day < 10 ? `0${day}` : `${day}`

  return `${year}-${formattedMonth}-${formattedDay}`
}

export const encryptString = (string: string) => crypto.AES.encrypt(string, process.env.CRYPTO_SECRET!).toString()

export const decryptString = (string: string) => {
  try {
    const bytes = crypto.AES.decrypt(string, process.env.CRYPTO_SECRET!)
    return bytes.toString(crypto.enc.Utf8)
  } catch (error) {
    console.log('🚀 ~ decryptString ~ error:', error)
  }
}

export const PAYMENT_CHANNELS = [
  { prismaName: 'BANCARIZADO', parsedName: 'bancarizado' },
  { prismaName: 'DEBITO_AUTOMATICO', parsedName: 'débito automático' },
  { prismaName: 'EFECTIVO', parsedName: 'efectivo' },
]

export const getPaymentChannelSafeText = (paymentChannel: PaymentChannel) =>
  PAYMENT_CHANNELS.find((item) => item.prismaName === paymentChannel)?.parsedName || ''
