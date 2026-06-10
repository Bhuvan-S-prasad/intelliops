'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/workspace-provider'
import type { ActiveWorkspaceDetails } from '@/components/workspace-provider'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  FileText,
  Table,
  FileCode,
  Terminal,
  File,
  Inbox,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react'

interface SearchResult {
  id: string
  fileId: string
  content: string
  metadata: Record<string, unknown>
  chunkIndex: number
  fileName: string
  fileType: 'PDF' | 'CSV' | 'JSON' | 'TXT' | 'LOG' | 'IMAGE'
  similarity: number
}

export default function WorkspaceSearchPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = React.use(params)
  const { activeWorkspace, workspaces, switchWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()
  const router = useRouter()

  // Align dynamic URL workspaceSlug with active workspace context
  React.useEffect(() => {
    if (isWorkspaceLoading || !activeWorkspace || !workspaces.length) return

    if (activeWorkspace.slug !== workspaceSlug) {
      const matchingWorkspace = workspaces.find((w) => w.slug === workspaceSlug)
      if (matchingWorkspace) {
        switchWorkspace(matchingWorkspace.id, true)
      } else {
        router.replace(`/${activeWorkspace.slug}/search`)
      }
    }
  }, [workspaceSlug, activeWorkspace, workspaces, isWorkspaceLoading, switchWorkspace, router])

  // Update page title and metadata
  React.useEffect(() => {
    if (activeWorkspace) {
      document.title = `Search — ${activeWorkspace.name} | IntelliOps`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `Run deep semantic searches across your uploaded database or raw content in workspace ${activeWorkspace.name}.`)
      }
    }
  }, [activeWorkspace])

  if (isWorkspaceLoading || !activeWorkspace || activeWorkspace.slug !== workspaceSlug) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-xs text-zinc-400">Loading search workspace...</p>
        </div>
      </div>
    )
  }

  return <SearchWorkspaceContent key={activeWorkspace.id} activeWorkspace={activeWorkspace} />
}

// Helper component to highlight search terms safely inside texts
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  
  // Escape regex specials
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
  
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark
            key={i}
            className="bg-indigo-500/20 text-indigo-300 font-semibold px-0.5 rounded border border-indigo-500/35"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function SearchWorkspaceContent({
  activeWorkspace,
}: {
  activeWorkspace: ActiveWorkspaceDetails
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isLoadingResults, setIsLoadingResults] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [filesCount, setFilesCount] = React.useState<number | null>(null)
  const [isFilesLoading, setIsFilesLoading] = React.useState(true)

  // 1. Debounce query input to 400ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query)
    }, 400)
    return () => clearTimeout(handler)
  }, [query])

  // 2. Load count of files in current workspace to trigger empty files state
  React.useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/workspaces/${activeWorkspace.id}/files`)
        if (res.ok) {
          const data = await res.json()
          setFilesCount(data.files?.length || 0)
        }
      } catch (err) {
        console.error('Failed to retrieve file count:', err)
      } finally {
        setIsFilesLoading(false)
      }
    }
    fetchFiles()
  }, [activeWorkspace.id])

  // 3. Fired on debounced query change
  React.useEffect(() => {
    const performSearch = async () => {
      const trimmed = debouncedQuery.trim()
      if (!trimmed) {
        setResults([])
        setHasSearched(false)
        return
      }

      setIsLoadingResults(true)
      try {
        const res = await fetch(`/api/workspaces/${activeWorkspace.id}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        })
        
        if (!res.ok) {
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}))
            toast.error(data.error || 'Too many search requests. Please wait a moment.')
          } else {
            throw new Error()
          }
          return
        }

        const data = await res.json()
        setResults(data.results || [])
        setHasSearched(true)
      } catch (err) {
        console.error('Search execution failed:', err)
        toast.error('Unable to fetch semantic search results')
      } finally {
        setIsLoadingResults(false)
      }
    }

    performSearch()
  }, [debouncedQuery, activeWorkspace.id])

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-3.5 w-3.5 text-red-400" />
      case 'CSV':
        return <Table className="h-3.5 w-3.5 text-emerald-400" />
      case 'JSON':
        return <FileCode className="h-3.5 w-3.5 text-amber-400" />
      case 'LOG':
        return <Terminal className="h-3.5 w-3.5 text-blue-400" />
      case 'IMAGE':
        return <ImageIcon className="h-3.5 w-3.5 text-purple-400" />
      default:
        return <File className="h-3.5 w-3.5 text-zinc-400" />
    }
  }

  // Pre-render skeletons
  const renderSkeletons = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 animate-pulse">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-zinc-800" />
                <div className="h-4 w-32 rounded bg-zinc-800" />
              </div>
              <div className="h-4 w-12 rounded bg-zinc-800" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-zinc-800" />
              <div className="h-3 w-[90%] rounded bg-zinc-800" />
              <div className="h-3 w-[80%] rounded bg-zinc-800" />
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="h-2 w-full rounded bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isFilesLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    )
  }

  // Empty state: No files uploaded to workspace
  if (filesCount === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <Search className="h-5 w-5 text-zinc-400" />
            Semantic Search
          </h1>
          <p className="text-xs text-zinc-400">
            Search across your datasets, PDFs, and log files using neural context.
          </p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-12 w-12 bg-zinc-900 border border-zinc-800/80 text-zinc-500 flex items-center justify-center rounded-xl">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-zinc-200">No indexed documents found</h2>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Upload files to start searching your workspace data. Once indexed, neural embeddings will search matches by meaning.
            </p>
          </div>
          <button
            onClick={() => router.push('/files')}
            className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg font-medium transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
          >
            Upload files
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <Search className="h-5 w-5 text-zinc-400" />
          Semantic Search
        </h1>
        <p className="text-xs text-zinc-400">
          Query meaning and context. Answers are found dynamically by embedding cosine similarities.
        </p>
      </div>

      {/* Large Input box */}
      <div className="relative border border-zinc-800 bg-zinc-900/30 rounded-xl p-3 flex items-center gap-3 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-lg">
        <Search className="h-5 w-5 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question or search keywords (e.g. 'What is the system timeout threshold?')..."
          className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-xs md:text-sm text-zinc-200 placeholder-zinc-500 font-sans"
        />
        <div className="flex items-center gap-2 shrink-0 select-none">
          {query.trim() && (
            <button
              onClick={() => setQuery('')}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 cursor-pointer"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] text-zinc-500 border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5 uppercase">
            ⌘K
          </span>
        </div>
      </div>

      {/* Search results view */}
      <div className="space-y-4">
        {isLoadingResults && renderSkeletons()}

        {!isLoadingResults && hasSearched && results.length === 0 && (
          <div className="bg-zinc-900/20 border border-zinc-805/50 rounded-xl p-10 text-center flex flex-col items-center justify-center space-y-2">
            <AlertCircle className="h-5 w-5 text-zinc-500" />
            <h3 className="text-xs font-semibold text-zinc-300">No matches found</h3>
            <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
              We couldnt find any content chunks matching {debouncedQuery} above a 35% similarity threshold. Try broadening your keywords.
            </p>
          </div>
        )}

        {!isLoadingResults && !hasSearched && (
          <div className="bg-zinc-900/10 border border-zinc-850/50 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="h-8 w-8 bg-indigo-500/5 text-indigo-400/80 border border-indigo-500/15 flex items-center justify-center rounded-lg">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <h3 className="text-xs font-semibold text-zinc-300">Grounded Semantic Query</h3>
            <p className="text-[11px] text-zinc-500 max-w-sm leading-relaxed">
              Start typing above. The system will slice your query, generate neural vectors, and return the matching text boundaries automatically.
            </p>
          </div>
        )}

        {!isLoadingResults && hasSearched && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => router.push(`/files?id=${item.fileId}`)}
                className="group bg-zinc-900/70 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700/80 transition-all flex flex-col justify-between space-y-4 cursor-pointer shadow-sm relative overflow-hidden"
              >
                {/* Score hover highlight */}
                <div className="absolute inset-0 bg-linear-to-r from-indigo-500/0 via-indigo-500/2 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-350 pointer-events-none" />

                <div className="space-y-3 relative z-10">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md bg-zinc-800/80 border border-zinc-750 text-zinc-300 shrink-0">
                        {getFileIcon(item.fileType)}
                      </div>
                      <span className="text-xs font-semibold text-zinc-200 truncate pr-2">
                        {item.fileName}
                      </span>
                    </div>
                    
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full shrink-0">
                      {(item.similarity * 100).toFixed(1)}% match
                    </span>
                  </div>

                  {/* Snippet Excerpt */}
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-4 wrap-break-words bg-zinc-950/30 border border-zinc-850/40 p-3 rounded-lg min-h-[72px]">
                    <HighlightText text={item.content} query={debouncedQuery} />
                  </p>
                </div>

                {/* Similarity meter progress bar */}
                <div className="space-y-1.5 relative z-10">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                    <span>Similarity threshold</span>
                    <span className="font-semibold text-zinc-400">
                      {(item.similarity * 100).toFixed(0)}/100
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden border border-zinc-750/30">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out shadow-sm shadow-indigo-500/50"
                      style={{ width: `${Math.min(100, Math.max(0, item.similarity * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
