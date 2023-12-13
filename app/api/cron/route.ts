import { mailer } from '@/lib/mailer'
import { headers } from 'next/headers'

export async function GET() {
  const headersList = headers()
  const token = headersList.get('Authorization')
  console.log('🚀 ~ file: route.ts:7 ~ GET ~ token:', token)
  console.log('🚀 ~ file: route.ts:10 ~ GET ~ process.env.CRON_SECRET:', process.env.CRON_SECRET)
  if (token !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    })
  }
  try {
    await mailer.sendMail({
      from: '"GastApp" <gastapp.ingeit@gmail.com>',
      to: 'rbrunount@gmail.com',
      subject: 'GASTAPP - CRON',
      html: '<b>Esto es desde CRON</b>',
    })
    return new Response('GET request successful', {
      status: 200,
    })
  } catch (error) {
    return new Response('Error', {
      status: 500,
    })
  }
}
