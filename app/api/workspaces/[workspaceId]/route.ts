import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
})

// GET /api/workspaces/[workspaceId]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    const { membership } = await requireWorkspaceAccess(workspaceId, 'USER')

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    return Response.json({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        description: workspace.description,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      currentUserRole: membership.role,
      members: workspace.members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces/[workspaceId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/workspaces/[workspaceId]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    await requireWorkspaceAccess(workspaceId, 'ADMIN')

    const body = await req.json()
    const parsed = UpdateWorkspaceSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description } = parsed.data

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    if (Object.keys(updateData).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    })

    return Response.json({ workspace: updated })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('PATCH /api/workspaces/[workspaceId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/workspaces/[workspaceId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    await requireWorkspaceAccess(workspaceId, 'OWNER')

    // Hard delete — cascades via Prisma schema (onDelete: Cascade)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    })

    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('DELETE /api/workspaces/[workspaceId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
