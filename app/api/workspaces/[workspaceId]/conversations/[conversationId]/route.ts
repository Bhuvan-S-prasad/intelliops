import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'

// GET /api/workspaces/[workspaceId]/conversations/[conversationId]
// Retrieve details and messages of a single conversation session
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; conversationId: string }> }
) {
  const { workspaceId, conversationId } = await params

  try {
    // Authenticate and verify workspace membership (at least USER role)
    const { user } = await requireWorkspaceAccess(workspaceId, 'USER')

    // Find the conversation and confirm it belongs to the active user and workspace
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        workspaceId,
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return Response.json({ conversation })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/conversations/[conversationId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/workspaces/[workspaceId]/conversations/[conversationId]
// Delete conversation session (restricted to conversation owner)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; conversationId: string }> }
) {
  const { workspaceId, conversationId } = await params

  try {
    // Authenticate and verify workspace membership (at least USER role)
    const { user } = await requireWorkspaceAccess(workspaceId, 'USER')

    // Validate conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        workspaceId,
      },
      select: {
        userId: true,
      },
    })

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Verify creator ownership
    if (conversation.userId !== user.id) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Delete the conversation (messages will cascade delete based on Prisma scheme settings)
    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    })

    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('DELETE /api/workspaces/[workspaceId]/conversations/[conversationId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
