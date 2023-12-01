import { fetchPersonToShare } from '@/services/settings'
import PersonToShareForm from './person-to-share-form'

export default async function PersonToShareWrapper() {
  const personsToShare = await fetchPersonToShare()

  return (
    <section className="bg-white rounded-lg p-4 md:p-6">
      <h1 className="text-xl mb-2">Personas para compartir gastos</h1>
      <PersonToShareForm />
      {personsToShare.length ? (
        personsToShare.map((personToShare) => <p key={personToShare.id}>&bull; {personToShare.name}</p>)
      ) : (
        <h2>No se crearon personas</h2>
      )}
    </section>
  )
}
