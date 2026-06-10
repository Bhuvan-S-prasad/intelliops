'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/workspace-provider'
import { toast } from 'sonner'
import {
  Search,
  MessageSquare,
  FileText,
  Plus,
  UploadCloud,
  Settings,
  Sparkles,
  Command,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface FileItem {
  id: string
  name: string
  fileType: string
}

interface ConversationItem {
  id: string
  title: string
  updatedAt: string
}

interface FlatOption {
  id: string
  label: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  type: 'conversation' | 'file' | 'action'
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const { activeWorkspace } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [conversations, setConversations] = React.useState<ConversationItem[]>([])
  const [files, setFiles] = React.useState<FileItem[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [prevQuery, setPrevQuery] = React.useState('')
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen)

  if (query !== prevQuery) {
    setPrevQuery(query)
    setSelectedIndex(0)
  }

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }
  
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 1. Fetch search options when opening command palette
  const fetchData = React.useCallback(async () => {
    if (!activeWorkspace) return
    setIsLoading(true)
    try {
      const [convRes, filesRes] = await Promise.all([
        fetch(`/api/workspaces/${activeWorkspace.id}/conversations`),
        fetch(`/api/workspaces/${activeWorkspace.id}/files`),
      ])

      const conversationsData = convRes.ok ? await convRes.json() : { conversations: [] }
      const filesData = filesRes.ok ? await filesRes.json() : { files: [] }

      setConversations(conversationsData.conversations || [])
      setFiles(filesData.files || [])
    } catch (err) {
      console.error('Failed to load command palette data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace])

  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData()
      // Lock page scroll
      document.body.style.overflow = 'hidden'
      // Auto-focus input
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, fetchData])

  // 2. Build quick actions
  const getQuickActions = React.useCallback((): FlatOption[] => {
    if (!activeWorkspace) return []
    return [
      {
        id: 'new-conversation',
        label: 'New Conversation',
        subtitle: 'Start a new AI conversation in this workspace',
        icon: Plus,
        type: 'action',
        action: async () => {
          onClose()
          try {
            const res = await fetch(`/api/workspaces/${activeWorkspace.id}/conversations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: `Chat ${new Date().toLocaleDateString()}` }),
            })
            if (!res.ok) throw new Error()
            const data = await res.json()
            toast.success('Started a new conversation')
            router.push(`/${activeWorkspace.slug}/chat?c=${data.conversation.id}`)
          } catch {
            toast.error('Could not create conversation')
          }
        },
      },
      {
        id: 'upload-file',
        label: 'Upload File',
        subtitle: 'Upload PDFs, CSVs, or logs to workspace context',
        icon: UploadCloud,
        type: 'action',
        action: () => {
          onClose()
          router.push('/files')
        },
      },
      {
        id: 'go-settings',
        label: 'Go to Settings',
        subtitle: 'Manage members, API settings, and workspace preferences',
        icon: Settings,
        type: 'action',
        action: () => {
          onClose()
          router.push('/settings')
        },
      },
    ]
  }, [activeWorkspace, router, onClose])

  // 3. Filter options by search text and flatten results
  const filteredOptions = React.useMemo(() => {
    if (!activeWorkspace) return []

    const q = query.trim().toLowerCase()
    
    // Filter conversations
    const filteredConvs: FlatOption[] = conversations
      .filter((c) => !q || c.title?.toLowerCase().includes(q))
      .map((c) => ({
        id: `conv-${c.id}`,
        label: c.title || 'Untitled Conversation',
        subtitle: `Updated: ${new Date(c.updatedAt).toLocaleDateString()}`,
        icon: MessageSquare,
        type: 'conversation',
        action: () => {
          onClose()
          router.push(`/${activeWorkspace.slug}/chat?c=${c.id}`)
        },
      }))

    // Filter files
    const filteredFiles: FlatOption[] = files
      .filter((f) => !q || f.name?.toLowerCase().includes(q))
      .map((f) => ({
        id: `file-${f.id}`,
        label: f.name,
        subtitle: `Type: ${f.fileType}`,
        icon: FileText,
        type: 'file',
        action: () => {
          onClose()
          router.push(`/files?id=${f.id}`)
        },
      }))

    // Filter quick actions
    const filteredActions = getQuickActions().filter(
      (a) => !q || a.label.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)
    )

    // Slice for clean palette layout when empty query
    if (!q) {
      return [
        ...filteredConvs.slice(0, 5),
        ...filteredFiles.slice(0, 5),
        ...filteredActions,
      ]
    }

    return [...filteredConvs, ...filteredFiles, ...filteredActions]
  }, [activeWorkspace, query, conversations, files, getQuickActions, onClose, router])

  // 4. Handle Arrow & Enter keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || filteredOptions.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredOptions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filteredOptions[selectedIndex]
        if (selected) {
          selected.action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredOptions])

  if (!isOpen) return null

  // Group options for styled separation in list display
  const conversationsList = filteredOptions.filter((o) => o.type === 'conversation')
  const filesList = filteredOptions.filter((o) => o.type === 'file')
  const actionsList = filteredOptions.filter((o) => o.type === 'action')

  // Helper to find the dynamic index in the flattened options array
  const getItemIndex = (id: string) => {
    return filteredOptions.findIndex((o) => o.id === id)
  }

  const renderOption = (opt: FlatOption) => {
    const idx = getItemIndex(opt.id)
    const isSelected = idx === selectedIndex
    const Icon = opt.icon

    return (
      <div
        key={opt.id}
        onClick={opt.action}
        onMouseEnter={() => setSelectedIndex(idx)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all border border-transparent select-none",
          isSelected
            ? "bg-zinc-800 border-zinc-700 text-zinc-100"
            : "bg-transparent text-zinc-400 hover:text-zinc-200"
        )}
      >
        <div className={cn(
          "p-1.5 rounded-md shrink-0 transition-colors",
          isSelected ? "bg-indigo-600/20 text-indigo-400" : "bg-zinc-800/50 text-zinc-500"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold truncate leading-normal text-zinc-200">
            {opt.label}
          </p>
          {opt.subtitle && (
            <p className={cn(
              "text-[10px] truncate leading-normal mt-0.5",
              isSelected ? "text-zinc-400" : "text-zinc-500"
            )}>
              {opt.subtitle}
            </p>
          )}
        </div>
        {isSelected && (
          <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase shrink-0">
            <Command className="h-2.5 w-2.5" />
            Enter
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="max-w-2xl w-full bg-zinc-900/90 border border-zinc-800/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] animate-in scale-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header bar */}
        <div className="flex items-center gap-3 px-4 border-b border-zinc-850 h-12 shrink-0">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace data..."
            className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-xs text-zinc-200 placeholder-zinc-500 font-sans"
          />
          <span className="text-[10px] text-zinc-500 border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5 uppercase select-none">
            Esc
          </span>
        </div>

        {/* Scrollable results list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 min-h-0">
          {isLoading && filteredOptions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-[11px] text-zinc-500">Retrieving workspace index...</p>
            </div>
          )}

          {!isLoading && filteredOptions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xs text-zinc-500">No results found matching: {query}</p>
            </div>
          )}

          {/* Conversations Section */}
          {conversationsList.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase px-3 pb-1">
                Recent Conversations
              </p>
              {conversationsList.map(renderOption)}
            </div>
          )}

          {/* Files Section */}
          {filesList.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase px-3 pb-1">
                Workspace Files
              </p>
              {filesList.map(renderOption)}
            </div>
          )}

          {/* Quick Actions Section */}
          {actionsList.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase px-3 pb-1">
                Quick Actions
              </p>
              {actionsList.map(renderOption)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-850 bg-zinc-950/40 shrink-0 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="bg-zinc-800 border border-zinc-700/60 px-1 py-0.5 rounded text-[8px]">↑↓</span>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-zinc-800 border border-zinc-700/60 px-1 py-0.5 rounded text-[8px]">Enter</span>
              Select
            </span>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>IntelliOps AI</span>
          </div>
        </div>
      </div>
    </div>
  )
}
