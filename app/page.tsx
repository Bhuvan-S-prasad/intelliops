'use client'

import * as React from 'react'
import Link from 'next/link'
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

const LOG_LINES = [
  { t: 'sys', msg: 'OpsIQ daemon v2.4.1 started' },
  { t: 'info', msg: 'Watching /workspace/uploads for new files' },
  { t: 'file', msg: 'Received: incident-report-2024-11.pdf (1.2 MB)' },
  { t: 'index', msg: 'Chunking document into 84 segments...' },
  { t: 'embed', msg: 'Generating embeddings [████████░░] 80%' },
  { t: 'embed', msg: 'Generating embeddings [██████████] 100%' },
  { t: 'ok', msg: 'Indexed: incident-report-2024-11.pdf' },
  { t: 'file', msg: 'Received: api-gateway-logs-oct.json (38 MB)' },
  { t: 'index', msg: 'Parsing 142,884 log entries...' },
  { t: 'warn', msg: 'Anomaly cluster detected at 2024-10-14T03:22Z' },
  { t: 'ok', msg: 'Indexed: api-gateway-logs-oct.json' },
  { t: 'query', msg: 'User query: "show p0 incidents in Q4"' },
  { t: 'search', msg: 'Hybrid search across 3 sources → 12 matches' },
  { t: 'ai', msg: 'Generating grounded response with citations...' },
  { t: 'ok', msg: 'Response ready (847ms)' },
  { t: 'file', msg: 'Received: db-schema-v7.sql (204 KB)' },
  { t: 'index', msg: 'Parsing schema: 63 tables, 418 columns' },
  { t: 'ok', msg: 'Indexed: db-schema-v7.sql' },
  { t: 'query', msg: 'User query: "foreign keys referencing users table"' },
  { t: 'search', msg: 'Structural search → 9 exact matches found' },
  { t: 'ok', msg: 'Response ready (312ms)' },
]

const TAG_COLORS: Record<string, string> = {
  sys: 'text-zinc-500',
  info: 'text-zinc-500',
  file: 'text-indigo-400',
  index: 'text-amber-400',
  embed: 'text-amber-400',
  ok: 'text-emerald-400',
  warn: 'text-orange-400',
  query: 'text-violet-400',
  search: 'text-violet-400',
  ai: 'text-indigo-400',
}

function Terminal() {
  const [visibleLines, setVisibleLines] = React.useState<number>(0)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (visibleLines >= LOG_LINES.length) return
    const delay = visibleLines === 0 ? 600 : Math.random() * 280 + 120
    const t = setTimeout(() => setVisibleLines((v) => v + 1), delay)
    return () => clearTimeout(t)
  }, [visibleLines])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleLines])

  return (
    <div className="relative w-full rounded-none border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-xs leading-relaxed">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        <span className="ml-3 text-zinc-600 text-[10px] tracking-widest uppercase">opsiq — live indexing</span>
      </div>

      {/* Log output */}
      <div className="p-4 space-y-1 h-72 overflow-y-auto scrollbar-none">
        {LOG_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} className="flex gap-3 items-start">
            <span className={`shrink-0 w-12 text-right uppercase text-[9px] tracking-wider font-semibold mt-px ${TAG_COLORS[line.t] ?? 'text-zinc-500'}`}>
              {line.t}
            </span>
            <span className="text-zinc-300">{line.msg}</span>
          </div>
        ))}
        {visibleLines < LOG_LINES.length && (
          <div className="flex gap-3 items-start">
            <span className="shrink-0 w-12" />
            <span className="text-zinc-300">
              <span className="inline-block w-1.5 h-3.5 bg-indigo-400 animate-pulse align-middle" />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

const FEATURES = [
  {
    label: 'Ingest anything',
    desc: 'PDFs, JSON dumps, SQL schemas, YAML configs, raw logs. OpsIQ indexes every byte without format negotiation.',
    accent: 'bg-indigo-500',
  },
  {
    label: 'Semantic + structural search',
    desc: 'Ask in plain English or filter by structure. Hybrid retrieval surfaces the right passage from the right document in milliseconds.',
    accent: 'bg-violet-500',
  },
  {
    label: 'Grounded AI responses',
    desc: 'Every answer is anchored to source passages. No hallucinations — every claim cites the exact document and line.',
    accent: 'bg-indigo-500',
  },
  {
    label: 'Workspace context',
    desc: 'All your files, all your queries, one persistent context. Ask follow-up questions across documents without re-uploading.',
    accent: 'bg-violet-500',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500/20 selection:text-indigo-200">

      {/* ─── Navbar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white tracking-tight">
              O
            </div>
            <span className="text-sm font-semibold tracking-tight text-zinc-100">OpsIQ</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-500">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Features</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Docs</a>
            <a href="#" className="hover:text-zinc-200 transition-colors">Changelog</a>
          </nav>

          <div className="flex items-center gap-3">
            <Show when="signed-in">
              <Link href="/dashboard">
                <button className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors font-medium">
                  Dashboard <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors font-medium">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3.5 py-1.5 rounded transition-colors">
                  Get started <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </SignUpButton>
            </Show>
          </div>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────── */}
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 border border-zinc-800 rounded px-2.5 py-1 text-[11px] font-medium text-zinc-400 tracking-wide uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Now in public beta
            </div>

            <div className="space-y-5">
              <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-zinc-100">
                Your ops data,<br />
                <span className="text-indigo-400">finally searchable.</span>
              </h1>
              <p className="text-base text-zinc-400 leading-relaxed max-w-md">
                Upload logs, schemas, configs, and incident reports. Search in plain English. Chat with AI that cites its sources. Every answer, grounded.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded transition-colors">
                    Start free <ArrowRight className="h-4 w-4" />
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-medium">
                    Sign in to workspace
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard">
                  <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded transition-colors">
                    Open dashboard <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </Show>
            </div>

            {/* Social proof strip */}
            <div className="flex items-center gap-6 pt-2 border-t border-zinc-900">
              <div>
                <div className="text-xl font-semibold text-zinc-100">142k+</div>
                <div className="text-xs text-zinc-600 mt-0.5">documents indexed</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <div className="text-xl font-semibold text-zinc-100">&lt;400ms</div>
                <div className="text-xs text-zinc-600 mt-0.5">median query time</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <div className="text-xl font-semibold text-zinc-100">SOC 2</div>
                <div className="text-xs text-zinc-600 mt-0.5">type II compliant</div>
              </div>
            </div>
          </div>

          {/* Right: live terminal */}
          <div className="relative">
            {/* Subtle glow behind terminal */}
            <div className="absolute -inset-px rounded bg-indigo-500/5 blur-2xl pointer-events-none" />
            <Terminal />
            <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live indexing pipeline — runs on every upload
            </div>
          </div>
        </section>

        {/* ─── Thin divider ───────────────────────────────── */}
        <div className="border-t border-zinc-900 max-w-7xl mx-auto" />

        {/* ─── Features ───────────────────────────────────── */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">Capabilities</p>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-100">
              Built for the ops layer
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-zinc-900 border border-zinc-900">
            {FEATURES.map((f) => (
              <div key={f.label} className="bg-zinc-950 p-8 space-y-3 group">
                <div className={`h-px w-8 ${f.accent} mb-5 transition-all group-hover:w-16`} />
                <h3 className="text-base font-semibold text-zinc-100">{f.label}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Thin divider ───────────────────────────────── */}
        <div className="border-t border-zinc-900 max-w-7xl mx-auto" />

        {/* ─── CTA banner ─────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-24 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Ready to index your stack?
            </h2>
            <p className="text-sm text-zinc-500 mt-2">Free during beta. No credit card required.</p>
          </div>
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="shrink-0 flex items-center gap-2 border border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/5 text-zinc-100 text-sm font-semibold px-5 py-2.5 rounded transition-all">
                Create workspace <ArrowUpRight className="h-4 w-4" />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard">
              <button className="shrink-0 flex items-center gap-2 border border-zinc-700 hover:border-indigo-500 hover:bg-indigo-500/5 text-zinc-100 text-sm font-semibold px-5 py-2.5 rounded transition-all">
                Open workspace <ArrowUpRight className="h-4 w-4" />
              </button>
            </Link>
          </Show>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-zinc-900 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">O</div>
            <span className="text-xs font-semibold text-zinc-500">OpsIQ</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-zinc-600">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Status</a>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}