import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'
import { z } from 'zod'

const createConversationSchema = z.object({
  title: z.string().max(100).optional(),
})

// POST /api/workspaces/[workspaceId]/conversations
// Create a new conversation
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // Authenticate and verify workspace membership (at least USER role)
    const { user } = await requireWorkspaceAccess(workspaceId, 'USER')

    const body = await req.json().catch(() => ({}))
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { title } = parsed.data

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        userId: user.id,
        title: title || 'New Chat Session',
      },
    })

    return Response.json({ conversation }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces/[workspaceId]/conversations error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/workspaces/[workspaceId]/conversations
// List conversations for the current user in this workspace
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    // Authenticate and verify workspace membership (at least USER role)
    const { user } = await requireWorkspaceAccess(workspaceId, 'USER')

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
        userId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            content: true,
          },
        },
      },
    })

    const result = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessagePreview: c.messages[0]?.content || null,
    }))

    return Response.json({ conversations: result })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId]/conversations error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
