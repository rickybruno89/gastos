'use server'
import prisma from '@/lib/prisma'
import jsPDF from 'jspdf'
import { unstable_noStore as noStore } from 'next/cache'
import { mailer } from '@/lib/mailer'
import { SendMailOptions } from 'nodemailer'
import { Invoice } from '@prisma/client'

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

export const sendPdfEmail = (imageData: string, pdfName: string, subject: string, invoiceData: Invoice) => {
  const pdf = new jsPDF()
  pdf.addImage(imageData, 'PNG', 0, 0, 210, 297, undefined, 'SLOW')

  const pdfData = pdf.output('arraybuffer')
  const pdfBuffer = Buffer.from(pdfData)

  // Enviar el email con el PDF adjunto
  const mailOptions: SendMailOptions = {
    from: invoiceData.personalEmail,
    to: invoiceData.personalEmail,
    bcc: invoiceData.personalEmail,
    subject,
    attachments: [
      {
        filename: pdfName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  }

  mailer.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error al enviar el correo:', error)
      return {
        success: false,
        error: 'Error al enviar el mail',
      }
    }

    console.log('Correo enviado: ' + info.response)
    return {
      success: true,
      error: 'OK',
    }
  })
}
