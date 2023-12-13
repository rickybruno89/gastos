import nodemailer from 'nodemailer'

export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAILER_USER,
    pass: process.env.MAILER_PASSWORD,
  },
  from: 'gastapp.ingeit@gmail.com',
})
