import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'
import { getCache, setCache } from '@/lib/cache'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // 1. Auth check: minimum USER role required
    await requireWorkspaceAccess(workspaceId, 'USER')

    // 2. Cache check: 2 minutes (120 seconds) per workspaceId
    const cacheKey = `cache:workspace:${workspaceId}:stats`
    const cachedStats = await getCache<any>(cacheKey)
    if (cachedStats) {
      return NextResponse.json(cachedStats)
    }

    // 3. Date threshold for weekly stats (last 7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // 4. Run database queries in parallel
    const [
      totalFiles,
      readyFiles,
      processingFiles,
      failedFiles,
      totalChunks,
      totalConversations,
      totalMessages,
      sizeAgg,
      filesByTypeResult,
      filesAddedThisWeek,
      auditLogs,
    ] = await Promise.all([
      // Total files
      prisma.file.count({ where: { workspaceId } }),
      // Ready files
      prisma.file.count({ where: { workspaceId, status: 'READY' } }),
      // Processing (queued or processing) files
      prisma.file.count({
        where: {
          workspaceId,
          status: { in: ['QUEUED', 'PROCESSING'] },
        },
      }),
      // Failed files
      prisma.file.count({ where: { workspaceId, status: 'FAILED' } }),
      // Total chunks
      prisma.chunk.count({ where: { workspaceId } }),
      // Total conversations
      prisma.conversation.count({ where: { workspaceId } }),
      // Total messages
      prisma.message.count({ where: { conversation: { workspaceId } } }),
      // Storage used bytes
      prisma.file.aggregate({
        where: { workspaceId },
        _sum: { sizeBytes: true },
      }),
      // Files by type
      prisma.file.groupBy({
        by: ['fileType'],
        where: { workspaceId },
        _count: { fileType: true },
      }),
      // Files added this week
      prisma.file.count({
        where: {
          workspaceId,
          createdAt: { gte: oneWeekAgo },
        },
      }),
      // Last 10 audit logs
      prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
    ])

    // 5. Structure filesByType response (ensure all types initialized)
    const filesByType: Record<string, number> = {
      PDF: 0,
      CSV: 0,
      JSON: 0,
      TXT: 0,
      LOG: 0,
    }
    for (const item of filesByTypeResult) {
      filesByType[item.fileType] = item._count.fileType
    }

    // 6. Format recent activity timeline items
    const recentActivity = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      userName: log.user?.name ?? 'System User',
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }))

    const stats = {
      totalFiles,
      totalChunks,
      readyFiles,
      processingFiles,
      failedFiles,
      totalConversations,
      totalMessages,
      storageUsedBytes: sizeAgg._sum.sizeBytes ?? 0,
      recentActivity,
      filesByType,
      filesAddedThisWeek,
    }

    // 7. Store in cache for 2 minutes (120 seconds)
    await setCache(cacheKey, stats, 120)

    return NextResponse.json(stats)
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
