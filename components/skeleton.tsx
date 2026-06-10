import * as React from 'react'
import { cn } from '@/lib/utils'

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("h-4 bg-zinc-800 rounded-md animate-pulse", className)} />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-zinc-900 border border-zinc-850 rounded-xl p-5 space-y-4 animate-pulse", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-zinc-800" />
          <div className="h-4 w-32 rounded bg-zinc-800" />
        </div>
        <div className="h-4 w-12 rounded bg-zinc-850" />
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded bg-zinc-800" />
        <div className="h-3.5 w-[90%] rounded bg-zinc-800" />
        <div className="h-3.5 w-[80%] rounded bg-zinc-850" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 4 }: { rows?: number }) {
  return (
    <div className="w-full space-y-2.5 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3.5 border-b border-zinc-800/60 gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-[30%] min-w-[120px] rounded bg-zinc-800" />
              <div className="h-2.5 w-[15%] min-w-[70px] rounded bg-zinc-850" />
            </div>
          </div>
          <div className="h-3 w-16 rounded bg-zinc-800 shrink-0" />
          <div className="h-3 w-24 rounded bg-zinc-800 shrink-0 hidden sm:block" />
          <div className="h-6 w-12 rounded bg-zinc-800 shrink-0" />
        </div>
      ))}
    </div>
  )
}
