'use client'
import { useToast } from '@/components/ui/use-toast'
import { dispatchEmail } from '@/services/settings'
import { useState } from 'react'

export default function MailerTest() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    try {
      setLoading(true)
      const response = await dispatchEmail()
      if (response)
        toast({
          title: 'OK',
          description: 'Email enviado correctamente',
        })
      else
        toast({
          title: 'Ups',
          variant: 'destructive',
          description: 'Hubo un error al enviar el email',
        })
    } catch (error) {
      toast({
        title: 'Ups',
        variant: 'destructive',
        description: 'Hubo un error al enviar el email',
      })
    } finally {
      setLoading(false)
    }
  }
  return (
    <div>
      <button
        className="w-fit uppercase text-xs text-white bg-orange-500 p-2 rounded-md hover:bg-gray-600 transition-all ease-in-out duration-300"
        disabled={loading}
        onClick={handleClick}
      >
        Mandar email de prueba
      </button>
    </div>
  )
}
