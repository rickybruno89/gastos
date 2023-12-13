'use client'
import { Button } from '@/components/ui/button'
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
      <Button disabled={loading} onClick={handleClick}>
        Mandar email de prueba
      </Button>
    </div>
  )
}
