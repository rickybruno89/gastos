import { mailer } from '@/lib/mailer'

export async function GET() {
  return await mailer.sendMail({
    from: '"GastApp" <gastapp.ingeit@gmail.com>',
    to: 'rbrunount@gmail.com',
    subject: 'GASTAPP - CRON',
    html: '<b>Esto es desde CRON</b>',
  })
}
