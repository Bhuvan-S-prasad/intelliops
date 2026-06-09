'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Bot } from 'lucide-react'

export default function ConversationsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-zinc-400" />
          Conversations
        </h1>
        <p className="text-xs text-zinc-400">
          Chat with OpsIQ AI, grounding answers in your uploaded workspace documents.
        </p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 p-8 flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
          <Bot className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg font-semibold mb-2">No active conversations</CardTitle>
        <CardDescription className="text-sm text-zinc-400 max-w-md">
          Start a new operational intelligence query to begin analyzing logs or datasets with AI.
        </CardDescription>
      </Card>
    </div>
  )
}
