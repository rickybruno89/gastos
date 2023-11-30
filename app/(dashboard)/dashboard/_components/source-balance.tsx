import { formatCurrency } from '@/lib/utils'
import { fetchPaymentSourceBalance } from '@/services/summary'
import { Prisma } from '@prisma/client'

type PaymentSourceBalanceWithInclude = Prisma.PaymentSourceGetPayload<{
  include: {
    expensePaymentSummaries: true
    creditCardPaymentSummaries: true
  }
}>

const calcPaymentSourceBalance = (paymentSourceBalance: PaymentSourceBalanceWithInclude[]) => {
  const totalsByName = paymentSourceBalance.map((obj) => {
    const totalExpense = obj.expensePaymentSummaries.reduce((acc, curr) => acc + curr.amount, 0)
    const totalCreditCard = obj.creditCardPaymentSummaries.reduce((acc, curr) => acc + curr.amount, 0)
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

  const paymentSourceItems = calcPaymentSourceBalance(paymentSourceBalance)

  return (
    <>
      <p className="font-bold">Balance necesario en cuentas</p>
      <div className="flex flex-wrap gap-4">
        <div className="rounded-md bg-white p-4 md:p-6 w-fit flex flex-col">
          {paymentSourceItems?.map((item) => (
            <div key={item.name}>
              <div className="flex justify-between gap-x-8 gap-y-4">
                <span className="font-bold">{item.name}</span>
                <span>{formatCurrency(item.totalAmount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
