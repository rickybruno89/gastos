'use server'
import prisma from '@/lib/prisma'
import { unstable_noStore as noStore } from 'next/cache'

export async function fetchInvoiceData() {
  noStore()

  try {
    const data = await prisma.invoice.findMany()
    return data[0]
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar invoice data')
  }
}
