import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100 text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 mb-2">
        <FileQuestion className="h-8 w-8 stroke-[1.5]" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Page not found</h1>
        <p className="text-sm text-zinc-450 leading-relaxed font-sans">
          The page you are looking for does not exist or has been moved to another path.
        </p>
      </div>

      <Link href="/dashboard">
        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-500/10">
          Go home
        </Button>
      </Link>
    </div>
  )
}
