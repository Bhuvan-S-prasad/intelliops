'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useWorkspace } from '@/components/workspace-provider'
import type { ActiveWorkspaceDetails } from '@/components/workspace-provider'
import { EmptyState } from '@/components/empty-state'
import { SkeletonCard } from '@/components/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  MessageSquare,
  Users,
  Search,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  UploadCloud,
  FileCode,
  Terminal,
  File,
  AlertCircle,
  Clock,
  Sparkles,
  Inbox,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  UserPlus,
  Activity,
  Trash2,
  FolderOpen,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'

interface Stats {
  totalFiles: number
  totalChunks: number
  readyFiles: number
  processingFiles: number
  failedFiles: number
  totalConversations: number
  totalMessages: number
  storageUsedBytes: number
  recentActivity: Array<{
    id: string
    action: string
    userId: string
    userName: string
    metadata: any
    createdAt: string
  }>
  filesByType: Record<string, number>
  filesAddedThisWeek: number
}

interface FileItem {
  id: string
  name: string
  fileType: 'PDF' | 'CSV' | 'JSON' | 'TXT' | 'LOG'
  sizeBytes: number
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'
  createdAt: string
  uploadedBy: {
    name: string | null
  }
}

interface IssueItem {
  issue?: string
  description?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  suggestedAction?: string
}

interface Insight {
  id: string
  type: 'FILE_SUMMARY' | 'KEY_ISSUES' | 'TREND' | 'ANOMALY'
  metadata: any
  createdAt: string
}

export default function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = React.use(params)
  const { activeWorkspace, workspaces, switchWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()
  const router = useRouter()

  // Align workspace dynamic slug with context
  React.useEffect(() => {
    if (isWorkspaceLoading || !activeWorkspace || !workspaces.length) return

    if (activeWorkspace.slug !== workspaceSlug) {
      const matchingWorkspace = workspaces.find((w) => w.slug === workspaceSlug)
      if (matchingWorkspace) {
        switchWorkspace(matchingWorkspace.id, true)
      } else {
        router.replace(`/${activeWorkspace.slug}`)
      }
    }
  }, [workspaceSlug, activeWorkspace, workspaces, isWorkspaceLoading, switchWorkspace, router])

  // Update page title and metadata
  React.useEffect(() => {
    if (activeWorkspace) {
      document.title = `Dashboard — ${activeWorkspace.name} | IntelliOps`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `Operational intelligence dashboard for workspace ${activeWorkspace.name}.`)
      }
    }
  }, [activeWorkspace])

  if (isWorkspaceLoading || !activeWorkspace || activeWorkspace.slug !== workspaceSlug) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs text-zinc-400">Loading workspace dashboard...</p>
        </div>
      </div>
    )
  }

  return <DashboardContent key={activeWorkspace.id} activeWorkspace={activeWorkspace} />
}

function DashboardContent({ activeWorkspace }: { activeWorkspace: ActiveWorkspaceDetails }) {
  const router = useRouter()
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [files, setFiles] = React.useState<FileItem[]>([])
  const [insights, setInsights] = React.useState<Insight[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchData = React.useCallback(async () => {
    try {
      const [statsRes, filesRes, insightsRes] = await Promise.all([
        fetch(`/api/workspaces/${activeWorkspace.id}/stats`),
        fetch(`/api/workspaces/${activeWorkspace.id}/files`),
        fetch(`/api/workspaces/${activeWorkspace.id}/insights`),
      ])

      if (statsRes.ok) setStats(await statsRes.json())
      if (filesRes.ok) {
        const filesData = await filesRes.json()
        setFiles(filesData.files || [])
      }
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json()
        setInsights(insightsData.insights || [])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load dashboard statistics')
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace.id])

  React.useEffect(() => {
    fetchData()
    // Timeline refresh every 60s
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton grid */}
        <div className="grid gap-4 grid-cols-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-span-12 md:col-span-6 lg:col-span-3">
              <SkeletonCard />
            </div>
          ))}
        </div>
        <div className="grid gap-6 grid-cols-12 mt-6">
          <div className="col-span-12 lg:col-span-8">
            <SkeletonCard className="h-[280px]" />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <SkeletonCard className="h-[280px]" />
          </div>
        </div>
      </div>
    )
  }

  // Empty state check (no files uploaded yet)
  if (!stats || stats.totalFiles === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{activeWorkspace.name} Dashboard</h1>
          <p className="text-xs text-zinc-400">Welcome to your operational intelligence hub.</p>
        </div>
        <EmptyState
          icon={FolderOpen}
          title="Your workspace is empty"
          description="Upload your first file to get started."
          action={{
            label: 'Upload files',
            onClick: () => router.push(`/${activeWorkspace.slug}/files`),
          }}
        />
      </div>
    )
  }

  // Formatting helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatChunks = (chunks: number) => {
    if (chunks >= 1000) return `${(chunks / 1000).toFixed(1)}k chunks`
    return `${chunks} chunks`
  }

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const getActionDetails = (action: string, metadata: any) => {
    switch (action) {
      case 'file.upload':
        return {
          desc: `Uploaded file ${metadata?.fileName || 'dataset'}`,
          icon: UploadCloud,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        }
      case 'file.delete':
        return {
          desc: `Deleted file ${metadata?.fileName || 'dataset'}`,
          icon: Trash2,
          color: 'text-red-400 bg-red-500/10 border-red-500/20',
        }
      case 'member.invite':
        return {
          desc: `Invited new member: ${metadata?.email || 'user'}`,
          icon: UserPlus,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
        }
      case 'query.run':
      case 'conversation.create':
      case 'message.create':
        return {
          desc: `Queried IntelliOps AI assistant`,
          icon: MessageSquare,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        }
      default:
        return {
          desc: action.replace('.', ' '),
          icon: Activity,
          color: 'text-zinc-400 bg-zinc-800/50 border-zinc-700/35',
        }
    }
  }

  // Horizontal bar data mapping
  const chartData = [
    { name: 'PDF', count: stats.filesByType.PDF || 0, fill: '#818cf8' }, // indigo-400
    { name: 'CSV', count: stats.filesByType.CSV || 0, fill: '#2dd4bf' }, // teal-400
    { name: 'JSON', count: stats.filesByType.JSON || 0, fill: '#fbbf24' }, // amber-400
    { name: 'TXT/LOG', count: (stats.filesByType.TXT || 0) + (stats.filesByType.LOG || 0), fill: '#a1a1aa' }, // zinc-400
  ]

  // Key issues lookup
  const keyIssuesInsight = insights.find((i) => i.type === 'KEY_ISSUES')
  const topIssues: IssueItem[] = keyIssuesInsight?.metadata?.issues?.slice(0, 3) || []

  // Recent 4 uploaded files
  const recentFiles = files.slice(0, 4)

  // mini status bar calculation
  const total = stats.totalFiles
  const readyPct = total > 0 ? (stats.readyFiles / total) * 100 : 0
  const procPct = total > 0 ? (stats.processingFiles / total) * 100 : 0
  const failPct = total > 0 ? (stats.failedFiles / total) * 100 : 0

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-3.5 w-3.5 text-red-400" />
      case 'CSV':
        return <Terminal className="h-3.5 w-3.5 text-emerald-400" />
      case 'JSON':
        return <FileCode className="h-3.5 w-3.5 text-amber-400" />
      case 'LOG':
        return <Terminal className="h-3.5 w-3.5 text-blue-400" />
      default:
        return <File className="h-3.5 w-3.5 text-zinc-400" />
    }
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'high':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      default:
        return 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return <Badge variant="outline" className="text-[10px] capitalize text-emerald-400 border-emerald-500/20 bg-emerald-500/5">Ready</Badge>
      case 'FAILED':
        return <Badge variant="outline" className="text-[10px] capitalize text-red-400 border-red-500/20 bg-red-500/5">Failed</Badge>
      case 'PROCESSING':
      case 'QUEUED':
        return <Badge variant="outline" className="text-[10px] capitalize text-indigo-400 border-indigo-500/20 bg-indigo-500/5 animate-pulse">Processing</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] capitalize text-zinc-400 border-zinc-700/50">Queued</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto bg-zinc-950/20 p-1 rounded-xl">
      {/* Page Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-widest">
          <BrainCircuit className="h-4 w-4" />
          Dashboard Overview
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
          {activeWorkspace.name}
        </h1>
        <p className="text-xs text-zinc-450 leading-relaxed max-w-2xl">
          Overview of operational datasets, ingestion feeds, and security issues resolved.
        </p>
      </div>

      {/* Row 1 — Stat Cards (4 Columns) */}
      <div className="grid gap-4 grid-cols-12">
        {/* Stat 1: Total files */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Total Files
            </CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-[32px] font-bold text-zinc-100">{stats.totalFiles}</div>
            <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              {stats.filesAddedThisWeek > 0 ? `+${stats.filesAddedThisWeek} this week` : '0 added this week'}
            </p>
          </CardContent>
        </Card>

        {/* Stat 2: Ingestion status */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              File Ingestion Status
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-full bg-zinc-800 rounded-full h-2 flex overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${readyPct}%` }} title={`Ready: ${stats.readyFiles}`} />
              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${procPct}%` }} title={`Processing: ${stats.processingFiles}`} />
              <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${failPct}%` }} title={`Failed: ${stats.failedFiles}`} />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-450 font-medium">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {stats.readyFiles} ready</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> {stats.processingFiles} active</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {stats.failedFiles} failed</span>
            </div>
          </CardContent>
        </Card>

        {/* Stat 3: Total Data Indexed */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Data Indexed
            </CardTitle>
            <BrainCircuit className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-[32px] font-bold text-zinc-100 truncate">{formatChunks(stats.totalChunks)}</div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Storage: {formatBytes(stats.storageUsedBytes)}
            </p>
          </CardContent>
        </Card>

        {/* Stat 4: Total conversations */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-3 bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-[32px] font-bold text-zinc-100">{stats.totalConversations}</div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Messages generated: {stats.totalMessages}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Activity Feed & File Type Breakdown */}
      <div className="grid gap-6 grid-cols-12">
        {/* Left: Activity feed (2/3 width) */}
        <Card className="col-span-12 lg:col-span-8 bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="border-b border-zinc-850 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-250">Recent Activity</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Live operational logs (auto-refreshes)</CardDescription>
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
          </CardHeader>
          <CardContent className="pt-4 max-h-[320px] overflow-y-auto pr-2 scrollbar-thin">
            {stats.recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
                <Activity className="h-6 w-6 stroke-[1.5] mb-2" />
                <p className="text-xs font-medium">No workspace activity recorded yet</p>
              </div>
            ) : (
              <div className="relative border-l border-zinc-800 ml-3.5 pl-6 space-y-5">
                {stats.recentActivity.map((log) => {
                  const details = getActionDetails(log.action, log.metadata)
                  const ActionIcon = details.icon
                  return (
                    <div key={log.id} className="relative group">
                      {/* Timeline Dot Icon */}
                      <span className={`absolute -left-[35px] top-0 flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-semibold ${details.color}`}>
                        <ActionIcon className="h-3 w-3" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs gap-4">
                          <p className="font-semibold text-zinc-200">
                            {details.desc}
                          </p>
                          <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                            {getRelativeTime(log.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-450 flex items-center gap-1.5">
                          <span>by {log.userName}</span>
                          <span className="text-zinc-700">·</span>
                          <span className="text-[10px] font-mono uppercase bg-zinc-950 border border-zinc-850 px-1 py-0.2 rounded text-zinc-500">
                            {log.action.replace('file.', '').replace('member.', '')}
                          </span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: File type distribution (1/3 width) */}
        <Card className="col-span-12 lg:col-span-4 bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardHeader className="border-b border-zinc-850 pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-250">File Type breakdown</CardTitle>
            <CardDescription className="text-xs text-zinc-500">Dataset distribution by extension</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col justify-center min-h-[200px]">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '11px', fontWeight: '500' }}
                  itemStyle={{ color: '#f4f4f5', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={4} barSize={10}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Issues Preview & Recent files */}
      <div className="grid gap-6 grid-cols-12">
        {/* Left: Key Issues preview */}
        <Card className="col-span-12 lg:col-span-6 bg-zinc-900 border-zinc-800 text-zinc-100 flex flex-col justify-between">
          <CardHeader className="border-b border-zinc-850 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-250">Key issues</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Top risks extracted from datasets</CardDescription>
            </div>
            <Link href={`/${activeWorkspace.slug}/insights`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5">
              View all insights
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-3">
            {topIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500 space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 stroke-[1.5]" />
                <p className="text-xs font-semibold text-zinc-400">All clear — no issues flagged</p>
                <p className="text-[10px] text-zinc-550 max-w-[240px]">Insights generator has not flagged any key issues under current data.</p>
              </div>
            ) : (
              topIssues.map((issue, i) => (
                <div key={i} className="flex flex-col gap-1.5 p-3 rounded-lg border border-zinc-800/80 bg-zinc-950/20 text-xs">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-semibold text-zinc-200 leading-normal">
                      {issue.issue || issue.description}
                    </p>
                    <Badge variant="outline" className={`text-[9px] font-semibold capitalize tracking-wider shrink-0 px-2 py-0.2 rounded-full ${getSeverityBadgeColor(issue.severity)}`}>
                      {issue.severity}
                    </Badge>
                  </div>
                  {issue.suggestedAction && (
                    <p className="text-[10px] text-zinc-450 italic mt-0.5">
                      Suggested action: {issue.suggestedAction}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Recent files */}
        <Card className="col-span-12 lg:col-span-6 bg-zinc-900 border-zinc-800 text-zinc-100 flex flex-col justify-between">
          <CardHeader className="border-b border-zinc-850 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-250">Recent Files</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Latest uploaded datasets</CardDescription>
            </div>
            <Link href={`/${activeWorkspace.slug}/files`} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5">
              Manage files
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="pt-4 flex-1 space-y-3">
            {recentFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500">
                <File className="h-6 w-6 stroke-[1.5] mb-2" />
                <p className="text-xs">No files uploaded yet</p>
              </div>
            ) : (
              recentFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => router.push(`/${activeWorkspace.slug}/files?id=${file.id}`)}
                  className="flex items-center justify-between gap-4 p-2.5 rounded-lg border border-zinc-800/40 hover:border-zinc-700/60 bg-zinc-950/10 cursor-pointer transition-all hover:bg-zinc-900/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-md bg-zinc-800/80 border border-zinc-750 shrink-0">
                      {getFileIcon(file.fileType)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate leading-snug">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {formatBytes(file.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-500 hidden sm:inline-block">
                      {getRelativeTime(file.createdAt)}
                    </span>
                    {getStatusBadge(file.status)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4 — Full Width Quick Actions */}
      <Card className="col-span-12 bg-zinc-900 border-zinc-800 text-zinc-100">
        <CardHeader className="pb-2 border-b border-zinc-850">
          <CardTitle className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid gap-4 grid-cols-2 md:grid-cols-4">
          {/* Action 1 */}
          <div
            onClick={() => router.push(`/${activeWorkspace.slug}/files`)}
            className="group flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/20 hover:border-indigo-500/30 hover:bg-indigo-500/2 transition-all cursor-pointer min-h-[100px]"
          >
            <div className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-250">
              <UploadCloud className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                Upload files
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Add PDFs, CSVs or logs</p>
            </div>
          </div>

          {/* Action 2 */}
          <div
            onClick={() => router.push(`/${activeWorkspace.slug}/chat`)}
            className="group flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/20 hover:border-indigo-500/30 hover:bg-indigo-500/2 transition-all cursor-pointer min-h-[100px]"
          >
            <div className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-250">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                Ask a question
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Ground answers in data</p>
            </div>
          </div>

          {/* Action 3 */}
          <div
            onClick={() => router.push(`/${activeWorkspace.slug}/insights`)}
            className="group flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/20 hover:border-indigo-500/30 hover:bg-indigo-500/2 transition-all cursor-pointer min-h-[100px]"
          >
            <div className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-250">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                View insights
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Analyze files automatically</p>
            </div>
          </div>

          {/* Action 4 */}
          <div
            onClick={() => router.push(`/settings`)}
            className="group flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/20 hover:border-indigo-500/30 hover:bg-indigo-500/2 transition-all cursor-pointer min-h-[100px]"
          >
            <div className="h-8 w-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-250">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors flex items-center gap-0.5">
                Manage members
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Invite teammates to workspace</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
