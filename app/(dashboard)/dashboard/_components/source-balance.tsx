'use client'
import { formatCurrency } from '@/lib/utils'
import { Prisma } from '@prisma/client'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

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

type DataWithInclude = Prisma.PaymentSourceGetPayload<{
  include: {
    expensePaymentSummaries: true
    creditCardPaymentSummaries: true
  }
}>

export default function SourceBalance({ paymentSourceBalance }: { paymentSourceBalance: DataWithInclude[] }) {
  const paymentSourceItems = calcItemsToPay(paymentSourceBalance)
  const alreadyPaid = calcItemsPaid(paymentSourceBalance)

  const handleScrollAccordion = (renderedItem: string) => {
    setTimeout(() => {
      if (renderedItem) {
        const element = document.getElementById('source-balance-content') as HTMLElement
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }, 200)
  }

  return (
    <section id="source-balance-content">
      <Accordion type="single" collapsible onValueChange={handleScrollAccordion}>
        <AccordionItem value="source-balance-content">
          <AccordionTrigger className="max-w-fit py-1">
            <p className="font-bold mr-5">Balance necesario en cuentas</p>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-wrap gap-4">
              <div className="rounded-md bg-white p-4 md:p-6 md:w-fit  min-w-[320px] flex flex-col w-full">
                <p className="font-bold uppercase">Falta pagar</p>
                {paymentSourceItems?.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between gap-x-8 gap-y-4">
                      <span>{item.name}</span>
                      <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end items-center gap-6 mt-4 font-bold">
                  <span>TOTAL</span>
                  <span>{formatCurrency(paymentSourceItems.reduce((acc, item) => acc + item.totalAmount, 0))}</span>
                </div>
              </div>
              <div className="rounded-md bg-white p-4 md:p-6 w-full md:w-fit  min-w-[320px] flex flex-col ">
                <p className="font-bold uppercase">Ya pagado</p>
                {alreadyPaid?.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between gap-x-8 gap-y-4">
                      <span>{item.name}</span>
                      <span className="font-bold">{formatCurrency(item.totalAmount)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end items-center gap-6 mt-4 font-bold">
                  <span>TOTAL</span>
                  <span>{formatCurrency(alreadyPaid.reduce((acc, item) => acc + item.totalAmount, 0))}</span>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
