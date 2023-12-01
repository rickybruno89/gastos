'use client'
import { Button } from '@/components/ui/button'
import { createPaymentType } from '@/services/settings'
import { useRef, useState } from 'react'

type State = {
  errors?: {
    name?: string[]
  }
  message?: string | null
}

const initialFormState = {
  errors: {},
  message: null,
}

export default function PaymentTypeForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [formState, setFormState] = useState<State>(initialFormState)
  const [showForm, setShowForm] = useState(false)

  const handleSubmitPaymentType = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const errors = await createPaymentType(formData)
    if (errors?.message) setFormState(errors)
    else {
      setFormState(initialFormState)
      if (formRef.current) {
        formRef.current.reset()
      }
    }
  }

  const handleCancel = () => {
    setShowForm(false)
  }

  return (
    <div className="my-2">
      {showForm ? (
        <form ref={formRef} onSubmit={handleSubmitPaymentType}>
          <div className="w-fit flex flex-col gap-2">
            <div className="">
              <input
                id="name"
                placeholder="Ej: Efectivo/Transferencia"
                name="name"
                type="text"
                aria-describedby="name-error"
                className="peer block w-full rounded-md border border-gray-200 text-sm outline-2 placeholder:text-gray-500"
              />
              {formState?.errors?.name ? (
                <div id="name-error" aria-live="polite" className="mt-2 text-sm text-red-500">
                  {formState.errors.name.map((error: string) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-4">
              <Button variant={'outline'} onClick={handleCancel}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </div>
        </form>
      ) : (
        <Button variant={'outline'} onClick={() => setShowForm(true)}>
          Nueva forma de pago
        </Button>
      )}
    </div>
  )
}
