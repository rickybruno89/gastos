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
  }
  message?: string | null
}

const PersonToShareExpenseSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1, { message: 'El nombre es requerido' }).toUpperCase(),
})

const CreatePersonToShareExpenseSchema = PersonToShareExpenseSchema.omit({
  id: true,
})

export const createPersonToShare = async (callbackUrl: string, _prevState: State, formData: FormData) => {
  try {
    const validatedFields = CreatePersonToShareExpenseSchema.safeParse({
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

    const existingPersonToShare = await prisma.person.findFirst({
      where: {
        name,
        userId,
      },
    })

    if (existingPersonToShare) {
      return {
        errors: { name: ['El nombre de la persona ya existe'] },
        message: 'Error',
      }
    }
    await prisma.person.create({
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
  redirect(callbackUrl)
}

export async function fetchPersonToShare() {
  noStore()
  try {
    const data = await prisma.person.findMany({
      where: {
        userId: await getAuthUserId(),
      },
    })
    return data
  } catch (error) {
    console.error('Error:', error)
    throw new Error('Error al cargar Personas')
  }
}
