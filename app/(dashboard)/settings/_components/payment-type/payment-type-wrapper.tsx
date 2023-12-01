import { fetchPaymentType } from '@/services/settings'
import PaymentTypeForm from './payment-type-form'

export default async function PaymentTypeWrapper() {
  const paymentTypes = await fetchPaymentType()

  return (
    <section className="bg-white rounded-lg p-4 md:p-6">
      <h1 className="text-xl mb-2">Formas de pago</h1>
      <PaymentTypeForm />
      {paymentTypes.length ? (
        paymentTypes.map((paymentType) => <p key={paymentType.id}>&bull; {paymentType.name}</p>)
      ) : (
        <h2>No se crearon formas de pago</h2>
      )}
    </section>
  )
}
