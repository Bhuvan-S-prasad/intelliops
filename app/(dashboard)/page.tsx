'use client'

import * as React from 'react'
import Link from 'next/link'
import { useWorkspace } from '@/components/workspace-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  MessageSquare,
  Users,
  Search,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
} from 'lucide-react'

export default function DashboardPage() {
  const { activeWorkspace, members } = useWorkspace()

  if (!activeWorkspace) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading workspace...</p>
        </div>
      </div>
    )
  }

  const cards = [
    {
      title: 'Analyze Documents',
      description: 'Upload PDFs, CSVs, logs, or JSON files to run automated processing.',
      href: '/files',
      icon: FileText,
      color: 'text-indigo-400 bg-indigo-500/10',
      action: 'Upload files',
    },
    {
      title: 'AI Conversations',
      description: 'Ask questions about your uploaded documents with source-grounded answers.',
      href: '/conversations',
      icon: MessageSquare,
      color: 'text-emerald-400 bg-emerald-500/10',
      action: 'Start chat',
    },
    {
      title: 'Search Logs',
      description: 'Run deep semantic searches across your uploaded database or raw content.',
      href: '/search',
      icon: Search,
      color: 'text-amber-400 bg-amber-500/10',
      action: 'Search files',
    },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
          <BrainCircuit className="h-4 w-4" />
          Operational Intelligence Hub
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 md:text-4xl">
          Welcome to {activeWorkspace.name}
        </h1>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          {activeWorkspace.description || 'Use OpsIQ to orchestrate files, build semantic search pipelines, and converse with document context.'}
        </p>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{members.length}</div>
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Active in workspace
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">0</div>
            <p className="text-[10px] text-zinc-500 mt-1">Ready for indexing</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Active Chats
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">0</div>
            <p className="text-[10px] text-zinc-500 mt-1">Conversations started</p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Guide */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-200">
          Getting Started
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700/80 transition-all flex flex-col justify-between text-zinc-100 shadow-md">
              <CardHeader className="p-5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color} mb-3`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">{card.title}</CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {card.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <Link href={card.href} className="inline-flex">
                  <Button variant="ghost" size="sm" className="h-8 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-800 px-0 pr-2 gap-1 group/btn">
                    {card.action}
                    <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
