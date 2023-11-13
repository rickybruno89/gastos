import { getServerSession } from "next-auth/next"

export default async function ServerPage() {
  const session = await getServerSession()


  return (
    <section className="flex flex-col gap-6">
      server
    </section>
  )

}