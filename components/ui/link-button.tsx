import Link from 'next/link'
import React from 'react'

export default function LinkButton({ children, href }: { children: React.ReactNode, href: string }) {
  return (
    <Link href={href} className='flex gap-1 justify-center items-center text-blue-400 hover:scale-105 transition-all ease-in-out duration-200 hover:text-blue-500 text-base'>
      {children}
    </Link>
  )
}
