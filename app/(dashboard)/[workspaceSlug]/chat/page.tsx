'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/components/workspace-provider'
import type { ActiveWorkspaceDetails } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Loader2,
  Calendar,
  ExternalLink,
  Bot,
  User as UserIcon,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'

interface DBMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: Array<{ chunkId: string; fileId: string; fileName: string; similarity: number }> | null
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessagePreview: string | null
}

export default function ChatPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = React.use(params)
  const { activeWorkspace, workspaces, switchWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()
  const router = useRouter()

  // 1. Align dynamic URL slug with the active workspace context
  React.useEffect(() => {
    if (isWorkspaceLoading || !activeWorkspace || !workspaces.length) return

    if (activeWorkspace.slug !== workspaceSlug) {
      const matchingWorkspace = workspaces.find((w) => w.slug === workspaceSlug)
      if (matchingWorkspace) {
        switchWorkspace(matchingWorkspace.id)
      } else {
        router.replace(`/${activeWorkspace.slug}/chat`)
      }
    }
  }, [workspaceSlug, activeWorkspace, workspaces, isWorkspaceLoading, switchWorkspace, router])

  if (isWorkspaceLoading || !activeWorkspace || activeWorkspace.slug !== workspaceSlug) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-xs text-zinc-400">Loading chat workspace...</p>
        </div>
      </div>
    )
  }

  // Keying the inner component by activeWorkspace.id automatically resets states (like messages)
  // when switching workspaces, preventing cascading render effects and linter issues.
  return <ChatWorkspaceContent key={activeWorkspace.id} activeWorkspace={activeWorkspace} />
}

function ChatWorkspaceContent({
  activeWorkspace,
}: {
  activeWorkspace: ActiveWorkspaceDetails
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlConvId = searchParams.get('c')

  // Chat State
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<DBMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isConversationsLoading, setIsConversationsLoading] = React.useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false)

  // Refs for scrolling and auto-height textarea
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // 2. Fetch conversations list for this workspace
  const fetchConversationsList = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/conversations`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {
      toast.error('Failed to load conversations')
    } finally {
      setIsConversationsLoading(false)
    }
  }, [activeWorkspace.id])

  // Load conversations on mount
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConversationsList()
  }, [fetchConversationsList])

  // 3. Load active conversation messages
  const loadConversationDetails = React.useCallback(async (conversationId: string) => {
    setIsMessagesLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/conversations/${conversationId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setActiveConversationId(conversationId)
      setMessages(data.conversation.messages || [])
    } catch {
      toast.error('Failed to load messages')
    } finally {
      setIsMessagesLoading(false)
    }
  }, [activeWorkspace.id])

  // Load conversation details when c query param changes
  React.useEffect(() => {
    if (urlConvId && urlConvId !== activeConversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadConversationDetails(urlConvId)
    }
  }, [urlConvId, activeConversationId, loadConversationDetails])

  // 4. Create new conversation session
  const handleCreateConversation = async () => {
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat ${new Date().toLocaleDateString()}` }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success('Started a new conversation')
      
      setIsConversationsLoading(true)
      await fetchConversationsList()
      loadConversationDetails(data.conversation.id)
    } catch {
      toast.error('Could not create conversation')
    }
  }

  // 5. Delete conversation session
  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation?')) return

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/conversations/${conversationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('Conversation deleted')
      
      if (activeConversationId === conversationId) {
        setActiveConversationId(null)
        setMessages([])
      }
      setIsConversationsLoading(true)
      await fetchConversationsList()
    } catch {
      toast.error('Could not delete conversation')
    }
  }

  // 6. Streaming Message Send Handler
  const handleSendMessage = async () => {
    if (!activeConversationId || !input.trim() || isStreaming) return

    const textToSend = input.trim()
    setInput('')
    setIsStreaming(true)

    // Save user message locally for instant render
    const tempUserMessage: DBMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      sources: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempUserMessage])

    // Append a placeholder assistant response that will be filled by stream
    const tempAssistantMessageId = `temp-assistant-${Date.now()}`
    const tempAssistantMessage: DBMessage = {
      id: tempAssistantMessageId,
      role: 'assistant',
      content: '',
      sources: null,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempAssistantMessage])

    try {
      const response = await fetch(
        `/api/workspaces/${activeWorkspace.id}/conversations/${activeConversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: textToSend }),
        }
      )

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to get stream response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let streamedContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const token = decoder.decode(value, { stream: true })
          streamedContent += token
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempAssistantMessageId ? { ...msg, content: streamedContent } : msg
            )
          )
        }
      }

      // Re-fetch conversation details to get standard DB IDs and source citations
      const refreshRes = await fetch(
        `/api/workspaces/${activeWorkspace.id}/conversations/${activeConversationId}`
      )
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        setMessages(refreshData.conversation.messages || [])
      }
      
      await fetchConversationsList()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Connection error'
      toast.error(errMsg)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempAssistantMessageId))
    } finally {
      setIsStreaming(false)
    }
  }

  // Auto-scrolling effect on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming])

  // Textarea auto-sizing adjustments
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Markdown customized code renderer
  const markdownComponents = {
    code({ className, children, inline, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean; node?: unknown }) {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = inline ?? !match
      
      return !isInline ? (
        <SyntaxHighlighter
          style={vscDarkPlus as unknown as { [key: string]: React.CSSProperties }}
          language={match ? match[1] : undefined}
          PreTag="div"
          className="text-xs rounded-md my-3 border border-zinc-800"
          {...(props as Omit<React.ComponentPropsWithoutRef<'div'>, 'style'>)}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={cn("bg-zinc-800/80 px-1.5 py-0.5 rounded text-xs text-indigo-300 font-mono", className)} {...props}>
          {children}
        </code>
      )
    },
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] items-stretch overflow-hidden border border-zinc-800 bg-zinc-950 rounded-xl">
      {/* 1. Left Sidebar: Conversations directory */}
      <aside className="w-70 shrink-0 border-r border-zinc-800 bg-zinc-900/20 flex flex-col justify-between">
        <div className="p-4 flex-1 flex flex-col min-h-0">
          <Button
            onClick={handleCreateConversation}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-medium shadow-md shadow-indigo-500/10 mb-4 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </Button>

          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
            {isConversationsLoading ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-8">No conversation history</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => loadConversationDetails(c.id)}
                  className={cn(
                    "group relative flex flex-col gap-1 p-3 rounded-lg border text-left cursor-pointer transition-all",
                    activeConversationId === c.id
                      ? "bg-zinc-900 border-zinc-700 text-zinc-100"
                      : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="truncate text-xs font-semibold pr-4 leading-normal">
                      {c.title}
                    </p>
                    <button
                      onClick={(e) => handleDeleteConversation(e, c.id)}
                      className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-0.5 rounded cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="truncate text-[10px] text-zinc-500">
                    {c.lastMessagePreview || 'No messages'}
                  </p>
                  <p className="text-[9px] text-zinc-600 flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* 2. Right Panel: Message streams */}
      <section className="flex-1 flex flex-col justify-between bg-zinc-950/20 overflow-hidden relative">
        {activeConversationId ? (
          <>
            {/* Messages body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {isMessagesLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
                      <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 flex items-center justify-center rounded-xl">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-200">Conversation Grounded</h3>
                      <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                        Send a message. OpsIQ will extract semantic context and ground answers automatically from your files.
                      </p>
                    </div>
                  )}

                  {messages.map((m) => {
                    const isUser = m.role === 'user'
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex gap-3",
                          isUser ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* Avatar */}
                        {!isUser && (
                          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div className="space-y-1.5 max-w-[80%]">
                          {/* Bubble text */}
                          {isUser ? (
                            <div className="rounded-2xl px-4 py-2.5 text-xs text-zinc-100 bg-zinc-800 leading-relaxed wrap-break-words">
                              {m.content}
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-200 leading-relaxed wrap-break-words pr-4 prose prose-invert font-sans prose-xs">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                          )}

                          {/* Sources citation chips */}
                          {!isUser && m.sources && m.sources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {m.sources.map((s, idx) => (
                                <button
                                  key={`${s.chunkId}-${idx}`}
                                  onClick={() => router.push(`/files?id=${s.fileId}`)}
                                  className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 rounded hover:bg-indigo-500/10 transition-colors cursor-pointer"
                                >
                                  <span>{s.fileName}</span>
                                  <span className="text-zinc-500 font-mono">
                                    ({(s.similarity * 100).toFixed(1)}%)
                                  </span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* User Icon */}
                        {isUser && (
                          <div className="h-8 w-8 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 flex items-center justify-center shrink-0">
                            <UserIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Bouncing typing indicator */}
                  {isStreaming && (
                    <div className="flex justify-start gap-3 items-center">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/50 px-3 py-2 rounded-xl">
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce" />
                      </div>
                    </div>
                  )}

                  <div ref={scrollRef} />
                </>
              )}
            </div>

            {/* Input panel area */}
            <div className="border-t border-zinc-800/80 bg-zinc-950 p-4">
              <div className="relative border border-zinc-800 bg-zinc-900/30 rounded-xl p-2.5 flex items-end gap-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about workspace files... (Ctrl+Enter)"
                  className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500 resize-none min-h-[20px] max-h-[120px] py-1 px-1 font-sans"
                  disabled={isStreaming}
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono select-none">
                    {input.length}/2000
                  </span>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isStreaming || !input.trim()}
                    size="icon-xs"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500 cursor-pointer shadow-md shadow-indigo-500/10"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grow flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="h-12 w-12 bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center rounded-xl animate-pulse">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h2 className="text-base font-semibold text-zinc-200">OpsIQ AI Conversations</h2>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Select an active conversation session from the directory sidebar, or click <strong>New Conversation</strong> to start query analysis.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
