'use client'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from 'react'

export default function ButtonDelete({ action, id }: { action: (id: string) => void; id: string }) {
  let [isOpen, setIsOpen] = useState(false)
  const handleEliminar = () => {
    setIsOpen(false)
    action(id)
  }
  return (
    <>
      <button className="hover:bg-orange-500 hover:text-white rounded-md px-2 py-1" onClick={() => setIsOpen(true)}>
        <span className="text-base">Eliminar</span>
      </button>
      <Dialog
        open={isOpen}
        as="div"
        onClose={() => setIsOpen(false)}
        transition
        className="fixed inset-0 flex w-screen items-center justify-center bg-black/50  backdrop-blur-sm p-4 transition duration-300 ease-out data-[closed]:opacity-0"
      >
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              transition
              className="w-full max-w-md rounded-xl bg-gradient-to-r from-gray-700 to-gray-900 p-6 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
            >
              <DialogTitle as="h3" className="text-base/7 font-medium ">
                <div className="flex justify-between text-white mb-4">
                  <span className="font-bold text-lg leading-none">¿Está totalmente seguro?</span>
                </div>
              </DialogTitle>
              <Description className="text-white">Esta acción es irreversible</Description>
              <div className="flex justify-end items-center gap-2 mt-4">
                <button className="text-gray-200" onClick={() => setIsOpen(false)}>
                  Cancelar
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-orange-500 text-white py-1.5 px-3 text-sm/6 font-semibold  shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-gray-600 data-[focus]:outline-1"
                  onClick={handleEliminar}
                >
                  Eliminar
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  )
}
