import { requireWorkspaceAccess } from '@/lib/auth'
import { checkInsightLimit } from '@/lib/rate-limit'
import { extractKeyIssues, identifyTrends } from '@/lib/insight-generator'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // 1. Auth: ADMIN or OWNER only
    await requireWorkspaceAccess(workspaceId, 'ADMIN')

    // 2. Rate limit: max 5 calls per hour per workspace
    const rateCheck = await checkInsightLimit(workspaceId)
    if (!rateCheck.success) {
      const retryAfter = Math.ceil((rateCheck.reset - Date.now()) / 1000)
      return Response.json(
        { error: 'Insight generation limit reached. Please try again later.', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      )
    }

    // 3. Mark existing KEY_ISSUES and TREND insights as stale immediately
    await prisma.insight.updateMany({
      where: {
        workspaceId,
        fileId: null,
        type: { in: ['KEY_ISSUES', 'TREND'] },
      },
      data: { isStale: true },
    })

    // 4. Run extractKeyIssues() and identifyTrends() async (fire and forget)
    void extractKeyIssues(workspaceId).catch((err) => {
      console.error(`Error in extractKeyIssues background job for workspace ${workspaceId}:`, err)
    })
    void identifyTrends(workspaceId).catch((err) => {
      console.error(`Error in identifyTrends background job for workspace ${workspaceId}:`, err)
    })

    // 5. Return success message
    return Response.json({ message: 'Insight generation started' })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces/[workspaceId]/insights/generate error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
