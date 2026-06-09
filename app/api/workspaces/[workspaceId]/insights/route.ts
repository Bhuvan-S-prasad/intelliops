import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'
import { getCache, setCache } from '@/lib/cache'
import { InsightType } from '@prisma/client'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // 1. Authenticate user & verify they have at least USER workspace permission
    await requireWorkspaceAccess(workspaceId, 'USER')

    // 2. Parse and validate search parameters
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const fileId = searchParams.get('fileId')

    let typeFilter: InsightType | undefined = undefined
    if (type) {
      if (['FILE_SUMMARY', 'KEY_ISSUES', 'TREND', 'ANOMALY'].includes(type)) {
        typeFilter = type as InsightType
      } else {
        return Response.json({ error: 'Invalid insight type' }, { status: 400 })
      }
    }

    // 3. Check cache
    const typeFilterKey = typeFilter || 'all'
    const fileIdFilterKey = fileId || 'all'
    const cacheKey = `insights:${workspaceId}:${typeFilterKey}:${fileIdFilterKey}`

    const cachedInsights = await getCache<unknown>(cacheKey)
    if (cachedInsights) {
      return Response.json({ insights: cachedInsights })
    }

    // 4. Query database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { workspaceId }
    if (typeFilter) {
      where.type = typeFilter
    }
    if (fileId !== null && fileId !== undefined) {
      if (fileId === 'null') {
        where.fileId = null
      } else {
        where.fileId = fileId
      }
    }

    const insights = await prisma.insight.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    // 5. Cache results for 5 minutes (300 seconds)
    await setCache(cacheKey, insights, 300)

    return Response.json({ insights })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/insights error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
