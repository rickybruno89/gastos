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
    <section className="w-full flex gap-x-4 flex-col md:flex-row items-center">
      <p className="font-bold text-center">Seleccione el mes para ver los resumenes</p>
      <input
        type="month"
        value={date}
        className="peer block rounded-md border border-gray-200  text-sm outline-2 placeholder:text-gray-500 w-full md:max-w-[250px]"
        onChange={(e) => handleChangeDate(e.target.value)}
      />
    </section>
  )
}
