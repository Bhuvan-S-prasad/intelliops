'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function DashboardErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-center px-4 space-y-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 text-red-500 shadow-inner">
        <AlertTriangle className="h-6 w-6 stroke-[1.5]" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-150">Workspace Error</h1>
        <p className="text-xs text-zinc-450 leading-relaxed font-sans">
          Something went wrong while loading this page. This could be due to a network interruption.
        </p>
      </div>

      {isDev && (
        <pre className="max-w-md text-left bg-zinc-900 border border-zinc-800 p-3 rounded-lg text-[10px] text-red-400 overflow-x-auto font-mono max-h-36 w-full leading-relaxed">
          {error.message || 'Unknown error'}
        </pre>
      )}

      <div className="flex items-center gap-2">
        <Button
          onClick={() => reset()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
        >
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="ghost" className="text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 text-xs font-semibold px-4 py-2 rounded-lg">
            Reset Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
