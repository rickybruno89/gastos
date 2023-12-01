'use server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'

const PaymentSourceSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, { message: 'El nombre es requerido' }).toUpperCase(),
})

const CreatePaymentSourceSchema = PaymentSourceSchema.omit({ id: true })

export const createPaymentSource = async (formData: FormData) => {
  try {
    const validatedFields = CreatePaymentSourceSchema.safeParse({
      name: formData.get('name'),
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { name } = validatedFields.data
    const userId = await getAuthUserId()

    const existingPaymentSource = await prisma.paymentSource.findFirst({
      where: {
        name,
        userId,
      },
    })

    if (existingPaymentSource) {
      return {
        errors: { name: ['El canal de pago ya existe'] },
        message: 'Error',
      }
    }
    await prisma.paymentSource.create({
      data: {
        name: name,
        userId,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.SETTINGS.BASE_PATH)
  revalidatePath(PAGES_URL.CREDIT_CARDS.CREATE)
  revalidatePath(PAGES_URL.EXPENSES.CREATE)
  redirect(PAGES_URL.SETTINGS.BASE_PATH)
}

export async function fetchPaymentSource() {
  noStore()
  try {
    const data = await prisma.paymentSource.findMany({
      where: {
        userId: await getAuthUserId(),
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Canales de pago')
  }
}
