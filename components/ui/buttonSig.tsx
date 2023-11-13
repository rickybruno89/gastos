"use client"
import { signIn } from 'next-auth/react'
import React from 'react'

export default function ButtonSig() {
  return (
    <div><button onClick={() => signIn("google")}>asdadlogin</button></div>
  )
}
