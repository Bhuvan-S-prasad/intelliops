'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100 text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-2">
        <AlertTriangle className="h-8 w-8 stroke-[1.5]" />
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Something went wrong.</h1>
        <p className="text-sm text-zinc-400 leading-relaxed font-sans">
          An unexpected operational error occurred while processing your request. Please try again.
        </p>
      </div>

      {isDev && (
        <pre className="max-w-xl text-left bg-zinc-900 border border-zinc-800 p-4 rounded-lg text-xs text-red-400 overflow-x-auto font-mono max-h-48 w-full leading-relaxed">
          {error.message || 'Unknown error'}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg cursor-pointer"
        >
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="ghost" className="text-zinc-450 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800">
            Go to dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
