import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customers',
};


export default async function CustomerPage() {

  const res = await fetch('https://api.spacexdata.com/v5/launches/query', {
    method: "POST"
  })
  const json: any = await res.json()

  return (
    <div>
      {
        json.docs.map((data: any) => (<h1 key={data.name}>{data.name}</h1>))
      }
    </div>
  )
}
