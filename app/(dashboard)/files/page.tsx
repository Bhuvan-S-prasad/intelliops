'use client'

import * as React from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { FolderOpen, UploadCloud } from 'lucide-react'

export default function FilesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-zinc-400" />
          File Explorer
        </h1>
        <p className="text-xs text-zinc-400">
          Upload and manage your workspace datasets, PDFs, and log logs.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 p-8 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
          <UploadCloud className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg font-semibold mb-2">No files uploaded yet</CardTitle>
        <CardDescription className="text-sm text-zinc-400 max-w-md">
          Upload files here to build a knowledge base. Supported files include PDF, CSV, JSON, TXT, and LOG.
        </CardDescription>
      </Card>
    </div>
  )
}
