import { fetchPaymentSource } from '@/services/settings'
import PaymentSourceForm from './payment-source-form'

export default async function PaymentSourceWrapper() {
  const paymentSources = await fetchPaymentSource()

  return (
    <section className="">
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
