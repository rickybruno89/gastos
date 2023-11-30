'use client'
import React, { useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getToday } from '@/lib/utils'

export default function MonthSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const date = searchParams.get('date') || getToday()

  useEffect(() => {
    router.push(pathname + '?' + createQueryString('date', date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleChangeDate = (date: string) => {
    router.push(pathname + '?' + createQueryString('date', date))
  }

  return (
    <section className="rounded-md bg-white p-4 md:p-6 w-fit flex gap-4">
      <h1>Seleccione el mes para ver los resumenes</h1>
      <input
        type="month"
        value={date}
        className="peer block w-full rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500"
        onChange={(e) => handleChangeDate(e.target.value)}
      />
    </section>
  )
}
