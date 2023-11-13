"use client"
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import React from 'react'

export default function ButtonSig() {

  const callbackUrl = useSearchParams().get('callbackUrl') || '/'

  return (
    <div><button onClick={() => signIn("google", { callbackUrl })}>LOGIN</button></div>
  )
}
