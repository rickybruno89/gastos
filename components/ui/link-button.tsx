import Link from 'next/link'
import React from 'react'

export default function LinkButton({ children, href }: { children: React.ReactNode, href: string }) {
  return (
    <Link href={href} className='flex gap-1 justify-center items-center text-blue-400 hover:scale-110 transition-all ease-in-out duration-200 hover:text-blue-500'>
      {children}
    </Link>
  )
}
