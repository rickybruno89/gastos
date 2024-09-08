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

export const sendPdfEmail = async (imageData: string, pdfName: string, subject: string, invoiceData: Invoice) => {
  try {
    const pdf = new jsPDF()
    pdf.addImage(imageData, 'PNG', 0, 0, 210, 297, undefined, 'SLOW')

    const pdfData = pdf.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfData)

    const mailOptions: SendMailOptions = {
      from: invoiceData.personalEmail,
      to: invoiceData.destinationEmail,
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

    await mailer.sendMail(mailOptions)
    return {
      success: true,
      error: 'OK',
    }
  } catch (error) {
    return {
      success: false,
      error: 'Error al enviar el mail',
    }
  }
}
