'use client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { TrashIcon } from '@heroicons/react/24/outline'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

export default function ButtonDelete({ action, id }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={'link'} size={'sm'} className="p-0">
          <TrashIcon className="w-5 h-5 text-red-500" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Está totalmente seguro?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción es irreversible.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button onClick={() => action(id)} variant={'destructive'} size={'sm'}>
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
