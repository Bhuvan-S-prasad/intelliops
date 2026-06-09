'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, BrainCircuit } from 'lucide-react'

export default function SearchPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <Search className="h-5 w-5 text-zinc-400" />
          Semantic Search
        </h1>
        <p className="text-xs text-zinc-400">
          Search across your uploaded knowledge base and logs with AI-driven semantic context.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 p-8 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-4">
          <BrainCircuit className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg font-semibold mb-2">Search Pipeline Not Active</CardTitle>
        <CardDescription className="text-sm text-zinc-400 max-w-md">
          Once you upload files and run indexing, you will be able to perform natural language searches across all workspace data.
        </CardDescription>
      </Card>
    </div>
  )
}
