'use client'

import * as React from 'react'
import Link from 'next/link'
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Search,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navbar */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
              O
            </div>
            <span className="font-semibold text-lg tracking-tight bg-linear-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">
              OpsIQ
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="text-zinc-300 hover:text-white border-zinc-800 hover:bg-zinc-900">
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20">
                  Get Started
                </Button>
              </SignUpButton>
            </Show>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold mx-auto">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Native Operational Intelligence Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 max-w-4xl mx-auto leading-[1.1]">
            Operational intelligence, <br />
            <span className="bg-linear-to-r from-indigo-400 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
              organized.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload technical documents, datasets, application logs, or configurations. Search semantically, analyze structures, and chat with AI in a unified workspace context.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 shadow-xl shadow-indigo-500/10">
                  Enter Dashboard
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-6 shadow-xl shadow-indigo-500/10">
                  Get Started for Free
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-zinc-300 hover:text-white border-zinc-800 hover:bg-zinc-900 text-sm px-6">
                  Sign In
                </Button>
              </SignInButton>
            </Show>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <section className="grid gap-6 sm:grid-cols-3 mt-20">
          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6 text-left space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">Deep File Explorer</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Upload and manage your workspace datasets, PDFs, JSON database dumps, or raw system logs, ready for AI indexing.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6 text-left space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Search className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">Semantic Vector Search</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Query your data in plain English. Get answers instantly via hybrid search indexing over document structures.
            </p>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-6 text-left space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200">Source Grounded Chat</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Chat with AI agents regarding system status or log dumps with full dynamic reference citations for every detail.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 bg-zinc-950 text-center text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} OpsIQ. Operational intelligence, organized.</p>
      </footer>
    </div>
  )
}
