"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Insight, InsightType } from "@prisma/client"
import { RefreshCcw, FileText, AlertTriangle, TrendingUp, Activity } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

// Matches IssueItem shape from lib/insight-generator.ts
interface IssueItem {
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  issue?: string // legacy alias for description
  sourceFiles: string[]
  suggestedAction: string
}

// Matches TrendItem shape from lib/insight-generator.ts
interface TrendPoint {
  title: string
  category: 'pattern' | 'anomaly' | 'trend'
  description: string
  value?: string
  confidence: 'high' | 'medium' | 'low'
  sourceFiles: string[]
  timestamp?: string
  time?: string
  date?: string
  metric?: string
}

interface KeyIssuesMetadata {
  issues: IssueItem[]
}

interface TrendMetadata {
  trends?: TrendPoint[]
  trendPoints?: TrendPoint[]
}

interface InsightCardProps {
  insight: Insight
  onRegenerate?: (insightId: string) => Promise<void>
  canRegenerate?: boolean
}

export function InsightCard({ insight, onRegenerate, canRegenerate = false }: InsightCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!onRegenerate) return
    setIsRegenerating(true)
    try {
      await onRegenerate(insight.id)
      toast.success("Regeneration started")
    } catch (err) {
      toast.error("Failed to regenerate insight")
    } finally {
      setIsRegenerating(false)
    }
  }

  const getTypeConfig = (type: InsightType) => {
    switch (type) {
      case "FILE_SUMMARY":
        return { icon: <FileText className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20", label: "Summary" }
      case "KEY_ISSUES":
        return { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20", label: "Key Issues" }
      case "TREND":
        return { icon: <TrendingUp className="h-4 w-4" />, color: "bg-green-500/10 text-green-500 hover:bg-green-500/20", label: "Trend" }
      case "ANOMALY":
        return { icon: <Activity className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20", label: "Anomaly" }
      default:
        return { icon: <Activity className="h-4 w-4" />, color: "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20", label: type }
    }
  }

  const config = getTypeConfig(insight.type)

  const renderContent = () => {
    if (insight.type === "KEY_ISSUES" && insight.metadata) {
      const metadata = insight.metadata as unknown as KeyIssuesMetadata
      const issues: IssueItem[] = metadata.issues || []
      return (
        <div className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4 text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.content}</ReactMarkdown>
          </div>
          {issues.length > 0 && (
            <div className="flex flex-col gap-3 mt-4">
              {issues.map((issue, i) => {
                const getSeverityColor = (sev: string) => {
                  switch(sev?.toLowerCase()) {
                    case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20'
                    case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                  }
                }
                return (
                  <div key={i} className="flex flex-col gap-2 p-3 rounded-md border border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-zinc-200 leading-tight">{issue.description || issue.issue}</p>
                      <Badge variant="outline" className={`text-[10px] capitalize whitespace-nowrap ${getSeverityColor(issue.severity)}`}>
                        {issue.severity || 'low'}
                      </Badge>
                    </div>
                    {issue.suggestedAction && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold bg-zinc-800 text-zinc-400">Action</Badge>
                        <span className="text-xs text-zinc-400">{issue.suggestedAction}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    if (insight.type === "TREND" && insight.metadata) {
      const metadata = insight.metadata as unknown as TrendMetadata
      const trends: TrendPoint[] = metadata.trends || metadata.trendPoints || []
      return (
        <div className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4 text-zinc-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.content}</ReactMarkdown>
          </div>
          {trends.length > 0 && (
            <div className="relative border-l border-zinc-800 ml-3 mt-4 space-y-6">
              {trends.map((point, i) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-zinc-950 border-2 border-indigo-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-zinc-950" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-zinc-500">{point.timestamp || point.time || point.date}</span>
                    <p className="text-sm font-medium text-zinc-200">{point.description || point.value}</p>
                    {point.metric && <span className="text-xs text-zinc-400">Metric: {point.metric}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Default Fallback
    return (
      <div className="text-sm text-zinc-300 leading-relaxed">
         <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{insight.content}</ReactMarkdown>
         </div>
      </div>
    )
  }

  return (
    <Card className="flex flex-col overflow-hidden h-full bg-zinc-950 border-zinc-800">
      {insight.isStale && (
        <div className="bg-amber-500/10 px-4 py-2 flex items-center justify-center border-b border-amber-500/20">
          <span className="text-xs font-medium text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> Data may be outdated — regenerate for latest insights
          </span>
        </div>
      )}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-2">
          <Badge variant="secondary" className={`flex items-center gap-1.5 w-fit ${config.color} border-transparent`}>
            {config.icon}
            {config.label}
          </Badge>
          <CardTitle className="text-lg leading-tight mt-2 text-zinc-100">{insight.title}</CardTitle>
        </div>
        {canRegenerate && onRegenerate && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            onClick={handleRegenerate}
            disabled={isRegenerating}
            title="Regenerate insight"
          >
            <RefreshCcw className={`h-4 w-4 ${isRegenerating ? 'animate-spin text-indigo-400' : ''}`} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="grow">
        {renderContent()}
      </CardContent>
    </Card>
  )
}
