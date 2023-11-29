'use server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getAuthUserId } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { PAGES_URL } from '@/lib/routes'

type State = {
  errors?: {
    name?: string[]
    useAsDefault?: string[]
  }
  message?: string | null
}

const CurrencySchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, { message: 'El nombre es requerido' }).toUpperCase(),
  useAsDefault: z.boolean(),
})

const CreateCurrencySchema = CurrencySchema.omit({
  id: true,
})

export const createCurrency = async (callbackUrl: string, _prevState: State, formData: FormData) => {
  try {
    const validatedFields = CreateCurrencySchema.safeParse({
      name: formData.get('name'),
      useAsDefault: formData.get('useAsDefault') === 'true',
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Error',
      }
    }

    const { name, useAsDefault } = validatedFields.data
    const userId = await getAuthUserId()

    const existingCurrency = await prisma.currency.findFirst({
      where: {
        name,
        userId,
      },
    })

    if (existingCurrency) {
      return {
        errors: { name: ['El nombre de la moneda ya existe'] },
        message: 'Error',
      }
    }
    await prisma.currency.create({
      data: {
        name: name,
        useAsDefault,
        userId,
      },
    })
  } catch (error) {
    return {
      message: 'Error en base de datos',
    }
  }
  revalidatePath(PAGES_URL.SETTINGS.BASE_PATH)
  redirect(callbackUrl)
}

export async function fetchCurrency() {
  noStore()
  // Add noStore() here prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  try {
    const data = await prisma.currency.findMany({})
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar las monedas')
  }
}
