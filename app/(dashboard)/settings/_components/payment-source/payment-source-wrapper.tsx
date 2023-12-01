import PaymentSourceForm from './payment-source-form'
import { fetchPaymentSource } from '@/services/settings/payment-source'

export default async function PaymentSourceWrapper() {
  const paymentSources = await fetchPaymentSource()

  return (
    <section className="bg-white rounded-lg p-4 md:p-6">
      <h1 className="text-xl mb-2">Canales de pago</h1>
      <PaymentSourceForm />
      {paymentSources.length ? (
        paymentSources.map((paymentSource) => <p key={paymentSource.id}>&bull; {paymentSource.name}</p>)
      ) : (
        <h2>No se crearon canales de pago</h2>
      )}
    </section>
  )
}
