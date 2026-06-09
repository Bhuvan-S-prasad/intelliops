import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; fileId: string }> }
) {
  const { workspaceId, fileId } = await params

  try {
    // Auth: USER or above
    await requireWorkspaceAccess(workspaceId, 'USER')

    const insight = await prisma.insight.findFirst({
      where: {
        workspaceId,
        fileId,
        type: 'FILE_SUMMARY',
      },
    })

    if (!insight) {
      return Response.json({ error: 'Summary insight not found for this file' }, { status: 404 })
    }

    return Response.json({ insight })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/files/[fileId]/insights error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
