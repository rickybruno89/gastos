'use client'
import React, { useState } from 'react'
import './invoice.css'
import { getTodayInvoice, removeCurrencyMaskFromInput } from '@/lib/utils'
import { Invoice } from '@prisma/client'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { NumericFormat } from 'react-number-format'
import jsPDF from 'jspdf'
import * as htmlToImage from 'html-to-image'
import { sendPdfEmail } from '@/services/invoice'

const USLocale = Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const toMonthName = (monthNumber: number) => {
  const date = new Date()
  date.setMonth(monthNumber - 1)

  return date.toLocaleString('en-US', {
    month: 'long',
  })
}

const InvoicePDF = ({ data }: { data: Invoice }) => {
  const [mepPrice, setMepPrice] = useState(0)
  const [isDialogOpen, setIsDialogOpen] = useState(true)
  const today = getTodayInvoice()
  const [month, day, year] = today.split('/')
  const [totalInvoice, setTotalInvoice] = useState(0)

  const currencyMask = (number: string | number) => (number !== '' ? '$' + USLocale.format(number as number) : '')

  const handleCloseDialog = () => {
    const discount = data.arsPayment / (mepPrice || 1)
    setTotalInvoice(data.usdPayment - discount)
    setIsDialogOpen(false)
  }

  const toTitleCase = (str: string) => {
    return str.replace(/\w\S*/g, function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    })
  }

  const sendMail = () => {
    const input = document.getElementById('divToPrint')
    htmlToImage
      .toPng(input!)
      .then(function (dataUrl) {
        const contractorName = toTitleCase(data.contractorName).split(' ').join('')
        const invoiceNumber = `${year}-${month}`
        const subject = `${data.contractorName.toUpperCase()} ${toMonthName(parseInt(month))} Invoice`
        const date = `${month}${day}${year}`
        const pdfName = `${contractorName}_DEPT_${invoiceNumber}_${date}`
        sendPdfEmail(dataUrl, pdfName, subject, data)
      })
      .catch(function (error) {
        console.error('oops, something went wrong!', error)
      })
  }

  const previewPDF = () => {
    const input = document.getElementById('divToPrint')
    htmlToImage
      .toPng(input!)
      .then(function (dataUrl) {
        const pdf = new jsPDF()
        pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297, undefined, 'SLOW')
        const pdfBlob = pdf.output('blob')
        const pdfUrl = URL.createObjectURL(pdfBlob)
        window.open(pdfUrl, '_blank')
      })
      .catch(function (error) {
        console.error('oops, something went wrong!', error)
      })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <button
          className="w-fit uppercase text-xs text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300"
          onClick={() => setIsDialogOpen(true)}
        >
          Ingresar cotización MEP
        </button>
        <p>{currencyMask(mepPrice)}</p>
      </div>
      <button
        className="w-fit uppercase text-xs text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300"
        onClick={previewPDF}
      >
        Previsualizar PDF
      </button>
      <button
        disabled={!totalInvoice || totalInvoice <= 0 || mepPrice <= 0}
        className="w-fit uppercase text-xs text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300 disabled:text-gray-500 disabled:bg-gray-200 disabled:cursor-not-allowed"
        onClick={sendMail}
      >
        Enviar Email
      </button>
      <div className="overflow-x-scroll overflow-y-scroll border-orange-500 border-2">
        <div id="divToPrint" className=" w-[210mm] h-[297mm] py-[2mm] px-[20mm] sheet">
          <div className="first-line" />
          <div className="name">{data.contractorName.toUpperCase()}</div>
          <div className="header">
            <div className="column-1">
              <div className="invoice-span">INVOICE</div>
              <div className="personal-email normal-text">{data.personalEmail}</div>
              <div>
                <div className="normal-text">{data.personalStreet}</div>
                <div className="normal-text">{data.personalState}</div>
                <div className="normal-text">{data.personalZip}</div>
              </div>
            </div>
            <div className="column-2">
              <div>
                <div className="normal-text">{data.destinationName}</div>
                <div className="normal-text">{data.destinationStreet}</div>
                <div className="normal-text">{data.destinationState + ' ' + data.destinationZip}</div>
                <div className="normal-text">Tax ID: {data.destinationTaxId}</div>
                <div className="normal-text">Date: {today}</div>
              </div>
              <div className="normal-text">Invoice Number: {year + '_' + month}</div>
            </div>
          </div>
          <div className="table-container">
            <table className="table-description">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{`Fee for services (${toMonthName(parseInt(month))} ${year})`}</td>
                  <td>1</td>
                  <td>{currencyMask(totalInvoice)}</td>
                  <td>{currencyMask(totalInvoice)}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td>Subtotal</td>
                  <td>{currencyMask(totalInvoice)}</td>
                </tr>
                <tr>
                  <td></td>
                  <td>Tax</td>
                  <td></td>
                  <td>{currencyMask(0)}</td>
                </tr>
                <tr>
                  <td></td>
                  <td></td>
                  <td>Total</td>
                  <td>{currencyMask(totalInvoice)}</td>
                </tr>
              </tbody>
            </table>
            <div className="payment-details">
              <p>Payment Details are as follows:</p>
              <p>
                <b>Bank Name:</b> {data.bankName}
              </p>
              <p>
                <b>Bank Address:</b> {data.bankAddress}
              </p>
              <p>
                <b>Routing Number:</b> {data.bankRoutingNumber}
              </p>
              <p>
                <b>Account Number:</b> {data.bankAccountNumber}
              </p>
              <p>
                <b>Account Type:</b> {data.bankAccountType}
              </p>
              <p>
                <b>Beneficiary Name:</b> {data.contractorName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        transition
        className="fixed inset-0 flex w-screen items-center justify-center bg-black/50  backdrop-blur-sm p-4 transition duration-300 ease-out data-[closed]:opacity-0"
      >
        <div className="fixed inset-0 z-10 w-screen ">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="text-white w-full max-w-md rounded-xl bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle className="font-bold mb-4">Aplicar descuento sueldo bruno</DialogTitle>
              <Description>Ingrese el valor del dolar MEP</Description>
              <form action={handleCloseDialog}>
                <div className="my-4 text-black">
                  <NumericFormat
                    autoFocus
                    inputMode="decimal"
                    className="rounded-md w-36 px-2 py-1 focus-visible:ring-2 focus-visible:ring-orange-500"
                    name="mepPrice"
                    id="mepPrice"
                    value={mepPrice}
                    prefix={'$ '}
                    thousandSeparator="."
                    decimalScale={2}
                    decimalSeparator=","
                    onChange={(e) => setMepPrice(removeCurrencyMaskFromInput(e.target.value))}
                  />
                </div>
                <div className="flex gap-4 mt-4">
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-orange-500 text-white py-1.5 px-3 text-sm/6 font-semibold  shadow-inner shadow-white/10 "
                    type="submit"
                  >
                    Aplicar
                  </button>
                </div>
              </form>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export default InvoicePDF
