// import React from 'react'
// import './invoice.css'
// import { InvoiceValues } from '../page'
// import { getTodayInvoice } from '@/lib/utils'

// const USLocale = Intl.NumberFormat('es-AR', {
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// })

// export const toMonthName = (monthNumber: number) => {
//   const date = new Date()
//   date.setMonth(monthNumber - 1)

//   return date.toLocaleString('en-US', {
//     month: 'long',
//   })
// }

// const InvoicePDF = ({ data }: { data: InvoiceValues }) => {
//   const today = getTodayInvoice()
//   const [month, day, year] = today.split('/')

//   const currencyMask = (number: string | number) => (number !== '' ? '$' + USLocale.format(number as number) : '')

//   const getTotal = () => 555

//   return (
//     <div id="divToPrint" className="sheet">
//       <div className="first-line" />
//       <div className="name">{data.contractorName.toUpperCase()}</div>
//       <div className="header">
//         <div className="column-1">
//           <div className="invoice-span">INVOICE</div>
//           <div className="personal-email normal-text">{data.personalEmail}</div>
//           <div>
//             <div className="normal-text">{data.personalStreet}</div>
//             <div className="normal-text">{data.personalState}</div>
//             <div className="normal-text">{data.personalZip}</div>
//           </div>
//         </div>
//         <div className="column-2">
//           <div>
//             <div className="normal-text">{data.destinationName}</div>
//             <div className="normal-text">{data.destinationStreet}</div>
//             <div className="normal-text">{data.destinationState + ' ' + data.destinationZip}</div>
//             <div className="normal-text">Tax ID: {data.destinationTaxId}</div>
//             <div className="normal-text">Date: {today}</div>
//           </div>
//           <div className="normal-text">Invoice Number: {year + '_' + month}</div>
//         </div>
//       </div>
//       <div className="table-container">
//         <table className="table-description">
//           <thead>
//             <tr>
//               <th>Description</th>
//               <th>Quantity</th>
//               <th>Unit Price</th>
//               <th>Cost</th>
//             </tr>
//           </thead>
//           <tbody>
//             <tr>
//               <td>{`Fee for services (${toMonthName(parseInt(month))} ${year})`}</td>
//               <td>1</td>
//               <td>{currencyMask(4000)}</td>
//               <td>{currencyMask(4000)}</td>
//             </tr>
//             <tr>
//               <td></td>
//               <td></td>
//               <td></td>
//               <td></td>
//             </tr>
//             <tr>
//               <td></td>
//               <td></td>
//               <td></td>
//               <td></td>
//             </tr>
//             <tr>
//               <td></td>
//               <td></td>
//               <td></td>
//               <td></td>
//             </tr>
//             <tr>
//               <td></td>
//               <td></td>
//               <td>Subtotal</td>
//               <td>{currencyMask(4000)}</td>
//             </tr>
//             <tr>
//               <td></td>
//               <td>Tax</td>
//               <td></td>
//               <td>{currencyMask(0)}</td>
//             </tr>
//             <tr>
//               <td></td>
//               <td></td>
//               <td>Total</td>
//               <td>{currencyMask(getTotal())}</td>
//             </tr>
//           </tbody>
//         </table>
//         <div className="payment-details">
//           <p>Payment Details are as follows:</p>
//           <p>
//             <b>Bank Name:</b> {data.bankName}
//           </p>
//           <p>
//             <b>Bank Address:</b> {data.bankAddress}
//           </p>
//           <p>
//             <b>Routing Number:</b> {data.bankRoutingNumber}
//           </p>
//           <p>
//             <b>Account Number:</b> {data.bankAccountNumber}
//           </p>
//           <p>
//             <b>Account Type:</b> {data.bankAccountType}
//           </p>
//           <p>
//             <b>Beneficiary Name:</b> {data.contractorName}
//           </p>
//         </div>
//       </div>
//       <div className="last-line" />
//     </div>
//   )
// }

// export default InvoicePDF
