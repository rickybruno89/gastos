import { formatCurrency } from '@/lib/utils'
import { fetchPaymentSourceBalance } from '@/services/summary'
import { Prisma } from '@prisma/client'

type PaymentSourceBalanceWithInclude = Prisma.PaymentSourceGetPayload<{
  include: {
    expensePaymentSummaries: true
    creditCardPaymentSummaries: true
  }
}>

const calcItemsToPay = (paymentSourceBalance: PaymentSourceBalanceWithInclude[]) => {
  const totalsByName = paymentSourceBalance.map((obj) => {
    const totalExpense = obj.expensePaymentSummaries.reduce((acc, curr) => (!curr.paid ? acc + curr.amount : acc), 0)
    const totalCreditCard = obj.creditCardPaymentSummaries.reduce(
      (acc, curr) => (!curr.paid ? acc + curr.amount : acc),
      0
    )
    const total = totalExpense + totalCreditCard

    return {
      name: obj.name,
      totalAmount: total,
    }
  })
  return totalsByName
}

const calcItemsPaid = (paymentSourceBalance: PaymentSourceBalanceWithInclude[]) => {
  const totalsByName = paymentSourceBalance.map((obj) => {
    const totalExpense = obj.expensePaymentSummaries.reduce((acc, curr) => (curr.paid ? acc + curr.amount : acc), 0)
    const totalCreditCard = obj.creditCardPaymentSummaries.reduce(
      (acc, curr) => (curr.paid ? acc + curr.amount : acc),
      0
    )
    const total = totalExpense + totalCreditCard

    return {
      name: obj.name,
      totalAmount: total,
    }
  })
  return totalsByName
}

export default async function SourceBalance({ date }: { date: string }) {
  const paymentSourceBalance = await fetchPaymentSourceBalance(date)

  const paymentSourceItems = calcItemsToPay(paymentSourceBalance)
  const alreadyPaid = calcItemsPaid(paymentSourceBalance)

  return (
    <>
      <p className="font-bold">Balance necesario en cuentas</p>

      <div className="flex flex-wrap gap-4">
        <div className="rounded-md bg-white p-4 md:p-6 md:w-fit min-w-[280px] flex flex-col w-full">
          <p className="font-bold uppercase">Falta pagar</p>
          {paymentSourceItems?.map((item) => (
            <div key={item.name}>
              <div className="flex justify-between gap-x-8 gap-y-4">
                <span>{item.name}</span>
                <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          ))}
          <p className="text-right uppercase font-bold">
            TOTAL: <span>{formatCurrency(paymentSourceItems.reduce((acc, item) => acc + item.totalAmount, 0))}</span>
          </p>
        </div>
        <div className="rounded-md bg-white p-4 md:p-6 w-full md:w-fit min-w-[280px] flex flex-col ">
          <p className="font-bold uppercase">Ya pagado</p>
          {alreadyPaid?.map((item) => (
            <div key={item.name}>
              <div className="flex justify-between gap-x-8 gap-y-4">
                <span>{item.name}</span>
                <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          ))}
          <p className="text-right uppercase font-bold">
            TOTAL: <span>{formatCurrency(alreadyPaid.reduce((acc, item) => acc + item.totalAmount, 0))}</span>
          </p>
        </div>
      </div>
    </>
  )
}
