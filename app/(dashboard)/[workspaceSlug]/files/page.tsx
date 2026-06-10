'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/workspace-provider'
import type { ActiveWorkspaceDetails } from '@/components/workspace-provider'
import { EmptyState } from '@/components/empty-state'
import { SkeletonTable } from '@/components/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  FolderOpen,
  UploadCloud,
  FileText,
  FileCode,
  Terminal,
  File,
  Search,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Loader2,
  Calendar,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

interface FileItem {
  id: string
  name: string
  originalName: string
  fileType: 'PDF' | 'CSV' | 'JSON' | 'TXT' | 'LOG' | 'IMAGE'
  sizeBytes: number
  status: 'QUEUED' | 'PROCESSING' | 'READY' | 'FAILED'
  chunkCount: number | null
  createdAt: string
  uploadedBy: {
    name: string | null
    avatarUrl: string | null
  }
}

type SortField = 'name' | 'size' | 'date'
type SortOrder = 'asc' | 'desc'

export default function WorkspaceFilesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = React.use(params)
  const { activeWorkspace, workspaces, switchWorkspace, isLoading: isWorkspaceLoading, currentUserRole } = useWorkspace()
  const router = useRouter()

  // Dynamic slug alignment
  React.useEffect(() => {
    if (isWorkspaceLoading || !activeWorkspace || !workspaces.length) return

    if (activeWorkspace.slug !== workspaceSlug) {
      const matchingWorkspace = workspaces.find((w) => w.slug === workspaceSlug)
      if (matchingWorkspace) {
        switchWorkspace(matchingWorkspace.id, true)
      } else {
        router.replace(`/${activeWorkspace.slug}/files`)
      }
    }
  }, [workspaceSlug, activeWorkspace, workspaces, isWorkspaceLoading, switchWorkspace, router])

  // Update page title and metadata
  React.useEffect(() => {
    if (activeWorkspace) {
      document.title = `Files — ${activeWorkspace.name} | IntelliOps`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `Upload, search, filter and manage dataset files in workspace ${activeWorkspace.name}.`)
      }
    }
  }, [activeWorkspace])

  if (isWorkspaceLoading || !activeWorkspace || activeWorkspace.slug !== workspaceSlug) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <p className="text-xs text-zinc-400">Loading files workspace...</p>
        </div>
      </div>
    )
  }

  const isAdminOrOwner = currentUserRole === 'ADMIN' || currentUserRole === 'OWNER'

  return <FilesWorkspaceContent key={activeWorkspace.id} activeWorkspace={activeWorkspace} isAdminOrOwner={isAdminOrOwner} />
}

function FilesWorkspaceContent({
  activeWorkspace,
  isAdminOrOwner,
}: {
  activeWorkspace: ActiveWorkspaceDetails
  isAdminOrOwner: boolean
}) {
  const [files, setFiles] = React.useState<FileItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  // Filters and sorting states
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'READY' | 'PROCESSING' | 'FAILED'>('ALL')
  const [sortField, setSortField] = React.useState<SortField>('date')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc')

  const fetchFiles = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/files`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFiles(data.files || [])
    } catch {
      toast.error('Failed to load files list')
    } finally {
      setIsLoading(false)
    }
  }, [activeWorkspace.id])

  React.useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // File Upload trigger
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress('Uploading file to storage...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/files`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      toast.success(`Uploaded ${file.name} successfully.`)
      await fetchFiles()
    } catch (err: any) {
      toast.error(err.message || 'Could not complete file upload')
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
      // reset file input
      e.target.value = ''
    }
  }

  // Delete handler
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This will delete all generated chunks and insights.`)) return

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/files/${fileId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success(`Deleted ${fileName}`)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    } catch {
      toast.error(`Could not delete file ${fileName}`)
    }
  }

  // Formatting helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-400" />
      case 'CSV':
        return <Terminal className="h-4 w-4 text-emerald-400" />
      case 'JSON':
        return <FileCode className="h-4 w-4 text-amber-400" />
      case 'LOG':
        return <Terminal className="h-4 w-4 text-blue-400" />
      case 'IMAGE':
        return <File className="h-4 w-4 text-purple-400" />
      default:
        return <File className="h-4 w-4 text-zinc-400" />
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

  // Summary header metrics
  const totalFilesCount = files.length
  const totalStorageBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0)
  const lastUploadTime = files.length > 0
    ? getRelativeTime(files.reduce((max, f) => new Date(f.createdAt) > new Date(max) ? f.createdAt : max, files[0].createdAt))
    : 'never'

  // Filtering logic
  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'READY' && file.status === 'READY') ||
      (statusFilter === 'FAILED' && file.status === 'FAILED') ||
      (statusFilter === 'PROCESSING' && (file.status === 'PROCESSING' || file.status === 'QUEUED'))

    return matchesSearch && matchesStatus
  })

  // Sorting logic
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let aVal: any
    let bVal: any

    if (sortField === 'date') {
      aVal = a.createdAt
      bVal = b.createdAt
    } else if (sortField === 'size') {
      aVal = a.sizeBytes
      bVal = b.sizeBytes
    } else {
      aVal = a.name
      bVal = b.name
    }

    if (sortField === 'date') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1.5 opacity-40" />
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1.5 text-indigo-400" />
      : <ArrowDown className="h-3 w-3 ml-1.5 text-indigo-400" />
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-zinc-400" />
            File Explorer
          </h1>
          <p className="text-xs text-zinc-450">
            Ingest PDFs, CSV database outputs, JSON reports, server logs, or images.
          </p>
        </div>

        {/* Upload Button */}
        {isAdminOrOwner && (
          <div className="relative shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept=".pdf,.csv,.json,.txt,.log,.jpg,.jpeg,.png,.gif,.webp,image/*"
            />
            <Button
              disabled={isUploading}
              onClick={handleUploadClick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/10"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4 mr-2" />
              )}
              Upload Dataset
            </Button>
          </div>
        )}
      </div>

      {/* Uploading progress notification */}
      {isUploading && uploadProgress && (
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
            <p className="text-xs text-zinc-350">{uploadProgress}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Header Bar */}
      <div className="grid gap-4 grid-cols-3 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-100">
        <div className="space-y-0.5 pl-2">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Files</p>
          <p className="text-xl font-bold text-zinc-100">{totalFilesCount}</p>
        </div>
        <div className="space-y-0.5 border-l border-zinc-800 pl-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Storage Used</p>
          <p className="text-xl font-bold text-zinc-100">{formatBytes(totalStorageBytes)}</p>
        </div>
        <div className="space-y-0.5 border-l border-zinc-800 pl-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Last Upload</p>
          <p className="text-xl font-bold text-zinc-100 truncate">{lastUploadTime}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-lg max-w-fit">
          {(['ALL', 'READY', 'PROCESSING', 'FAILED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                statusFilter === status
                  ? 'bg-zinc-850 border border-zinc-700/50 text-indigo-450 shadow-sm'
                  : 'bg-transparent border border-transparent text-zinc-450 hover:text-zinc-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status === 'READY' ? 'Ready' : status === 'PROCESSING' ? 'Processing' : 'Failed'}
            </button>
          ))}
        </div>

        {/* Client side Search */}
        <div className="relative flex items-center bg-zinc-900 border border-zinc-850 focus-within:border-indigo-500/50 rounded-xl px-3 py-1.5 w-full md:max-w-xs shadow-sm focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
          <Search className="h-4 w-4 text-zinc-500 shrink-0 mr-2" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by file name..."
            className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs p-0 text-zinc-200 placeholder-zinc-500 max-h-5"
          />
        </div>
      </div>

      {/* Files List Table */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : files.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No files uploaded yet"
          description="Upload files here to build a knowledge base. Supported files include PDF, CSV, JSON, TXT, and LOG."
          action={
            isAdminOrOwner
              ? {
                  label: 'Upload files',
                  onClick: handleUploadClick,
                }
              : undefined
          }
        />
      ) : sortedFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 bg-zinc-900/10 rounded-xl text-center space-y-3">
          <Search className="h-8 w-8 text-zinc-650" />
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-zinc-400">No matching files found</h3>
            <p className="text-[11px] text-zinc-550 max-w-xs leading-normal">
              We couldn't find any documents matching your filters. Try clearing your search term or tab filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-450 select-none">
                  <th
                    onClick={() => toggleSort('name')}
                    className="p-4 font-semibold hover:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center">
                      Name
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('size')}
                    className="p-4 font-semibold hover:text-zinc-200 cursor-pointer transition-colors w-28 text-right"
                  >
                    <div className="flex items-center justify-end">
                      Size
                      {renderSortIndicator('size')}
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('date')}
                    className="p-4 font-semibold hover:text-zinc-200 cursor-pointer transition-colors w-36 text-right"
                  >
                    <div className="flex items-center justify-end">
                      Uploaded
                      {renderSortIndicator('date')}
                    </div>
                  </th>
                  <th className="p-4 font-semibold w-24 text-center">Status</th>
                  {isAdminOrOwner && <th className="p-4 font-semibold w-16 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sortedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-zinc-900/30 text-zinc-350 transition-colors group"
                  >
                    {/* Name */}
                    <td className="p-4 font-medium min-w-[200px] truncate max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-md bg-zinc-850 border border-zinc-750 group-hover:border-zinc-700 shrink-0">
                          {getFileIcon(file.fileType)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-zinc-250 leading-none">
                            {file.name}
                          </p>
                          {file.chunkCount !== null && (
                            <p className="text-[10px] text-zinc-500 mt-1.5 font-mono">
                              {file.chunkCount} segments generated
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="p-4 text-right font-mono text-zinc-400 w-28 whitespace-nowrap">
                      {formatBytes(file.sizeBytes)}
                    </td>

                    {/* Upload Date */}
                    <td className="p-4 text-right text-zinc-450 w-36 whitespace-nowrap">
                      {getRelativeTime(file.createdAt)}
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center w-24 whitespace-nowrap">
                      {getStatusBadge(file.status)}
                    </td>

                    {/* Actions */}
                    {isAdminOrOwner && (
                      <td className="p-4 text-center w-16 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteFile(file.id, file.name)}
                          className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
