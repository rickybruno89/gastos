'use client'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

export default function ButtonTooltip({
  action = 'hover',
  trigger,
  content,
}: {
  action?: 'click' | 'hover'
  trigger: React.ReactNode
  content: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <TooltipProvider delayDuration={100}>
      {action === 'click' ? (
        <Tooltip open={open} defaultOpen={false}>
          <TooltipTrigger onClick={() => setOpen((current) => !current)}>{trigger}</TooltipTrigger>
          <TooltipContent>{content}</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger>{trigger}</TooltipTrigger>
          <TooltipContent>{content}</TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  )
}
