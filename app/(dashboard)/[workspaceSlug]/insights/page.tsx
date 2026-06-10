"use client"

import * as React from "react"
import { useWorkspace } from "@/components/workspace-provider"
import { InsightCard } from "@/components/insights/insight-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Insight } from "@prisma/client"
import { Loader2, RefreshCcw, FileText, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface FullInsightModalProps {
  selectedInsight: Insight | null
  onOpenChange: (open: boolean) => void
}

function FullInsightModal({ selectedInsight, onOpenChange }: FullInsightModalProps) {
  if (!selectedInsight) return null
  
  return (
    <Dialog open={!!selectedInsight} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-2xl text-zinc-100">{selectedInsight.title}</DialogTitle>
          {selectedInsight.fileId && (
            <DialogDescription className="text-zinc-400">
              File-specific analysis
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedInsight.content}
            </ReactMarkdown>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function InsightsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = React.use(params)
  const { activeWorkspace, workspaces, switchWorkspace, isLoading: isWorkspaceLoading, currentUserRole } = useWorkspace()
  const router = useRouter()

  const [insights, setInsights] = React.useState<Insight[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRegenerating, setIsRegenerating] = React.useState(false)
  const [selectedInsight, setSelectedInsight] = React.useState<Insight | null>(null)

  React.useEffect(() => {
    if (isWorkspaceLoading || !activeWorkspace || !workspaces.length) return

    if (activeWorkspace.slug !== workspaceSlug) {
      const matchingWorkspace = workspaces.find((w) => w.slug === workspaceSlug)
      if (matchingWorkspace) {
        switchWorkspace(matchingWorkspace.id, true)
      } else {
        router.replace(`/${activeWorkspace.slug}/insights`)
      }
    }
  }, [workspaceSlug, activeWorkspace, workspaces, isWorkspaceLoading, switchWorkspace, router])

  // Update page title and metadata
  React.useEffect(() => {
    if (activeWorkspace) {
      document.title = `Insights — ${activeWorkspace.name} | IntelliOps`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `Automated AI analysis, key issues and trends for workspace ${activeWorkspace.name}.`)
      }
    }
  }, [activeWorkspace])

  const fetchInsights = React.useCallback(async () => {
    if (!activeWorkspace) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/insights`)
      if (!res.ok) throw new Error("Failed to fetch insights")
      const data = await res.json()
      setInsights(data.insights || [])
    } catch (err) {
      toast.error("Failed to load insights")
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace])

  React.useEffect(() => {
    if (activeWorkspace?.id && activeWorkspace.slug === workspaceSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchInsights()
    }
  }, [activeWorkspace?.id, workspaceSlug, fetchInsights])

  const handleRegenerateAll = async () => {
    if (!activeWorkspace) return
    setIsRegenerating(true)
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/insights/generate`, {
        method: "POST"
      })
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json()
          toast.error(data.error || "Rate limit reached. Try again later.")
          return
        }
        throw new Error("Failed to regenerate")
      }
      toast.success("Insight regeneration started. It may take a few minutes.")
      await fetchInsights() // Refresh to show stale states
    } catch (err) {
      toast.error("Failed to start insight regeneration")
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isWorkspaceLoading || !activeWorkspace || activeWorkspace.slug !== workspaceSlug) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-xs text-zinc-400">Loading insights...</p>
        </div>
      </div>
    )
  }

  const canRegenerate = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  // We could implement individual regeneration if we had the API, but for now we'll trigger global
  const handleIndividualRegenerate = async (_insightId: string) => {
    await handleRegenerateAll()
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="p-6">
        <div className="flex h-[60vh] shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 mb-4">
              <AlertCircle className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-200">No insights yet</h3>
            <p className="mb-4 mt-2 text-sm text-zinc-400">
              Upload and process files to generate automated insights about your workspace data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const keyIssues = insights.find(i => i.type === 'KEY_ISSUES')
  const trend = insights.find(i => i.type === 'TREND')
  const fileSummaries = insights
    .filter(i => i.type === 'FILE_SUMMARY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)


  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Workspace Insights</h2>
          <p className="text-sm text-zinc-400 mt-1">AI-generated analysis of your operational data</p>
        </div>
        {canRegenerate && (
          <Button 
            onClick={handleRegenerateAll} 
            disabled={isRegenerating}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
          >
            {isRegenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Regenerate All
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {keyIssues && (
          <div className="col-span-full">
            <InsightCard 
              insight={keyIssues} 
              canRegenerate={canRegenerate}
              onRegenerate={handleIndividualRegenerate}
            />
          </div>
        )}
        
        {trend && (
          <div className="col-span-full lg:col-span-2">
            <InsightCard 
              insight={trend} 
              canRegenerate={canRegenerate}
              onRegenerate={handleIndividualRegenerate}
            />
          </div>
        )}

        {fileSummaries.length > 0 && (
          <div className="col-span-full lg:col-span-1">
            <Card className="h-full flex flex-col bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-zinc-100">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Recent Summaries
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Latest file analyses
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4">
                  {fileSummaries.map((summary) => (
                    <button
                      key={summary.id}
                      onClick={() => setSelectedInsight(summary)}
                      className="flex flex-col gap-1.5 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-colors text-left w-full"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200 truncate">{summary.title}</p>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {summary.content}
                      </p>
                      {summary.fileId && (
                        <div className="mt-1">
                           <span className="text-[10px] text-indigo-400">
                             Click to view full analysis →
                           </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      
      <FullInsightModal 
        selectedInsight={selectedInsight} 
        onOpenChange={(open) => !open && setSelectedInsight(null)}
      />
    </div>
  )
}
