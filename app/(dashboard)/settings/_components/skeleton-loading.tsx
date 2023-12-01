import { Skeleton } from '@/components/ui/skeleton'
import React from 'react'

export default function SkeletonLoadingSettings() {
  return (
    <div className="bg-white rounded-lg p-4 md:p-6 flex flex-col gap-4">
      <Skeleton className="w-60 h-5" />
      <Skeleton className="w-40 h-3" />
      <Skeleton className="w-40 h-3" />
      <Skeleton className="w-40 h-3" />
      <Skeleton className="w-40 h-3" />
      <Skeleton className="w-40 h-3" />
    </div>
  )
}
