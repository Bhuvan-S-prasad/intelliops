import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'

const UpdateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'USER']),
})

// PATCH /api/workspaces/[workspaceId]/members/[userId]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  const { workspaceId, userId: targetUserId } = await params

  try {
    const { user: currentUser } = await requireWorkspaceAccess(workspaceId, 'OWNER')

    // Cannot change your own role
    if (currentUser.id === targetUserId) {
      return Response.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const parsed = UpdateRoleSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { role } = parsed.data

    // Look up the target member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
    })

    if (!targetMember) {
      return Response.json({ error: 'Member not found' }, { status: 404 })
    }

    // Cannot change another OWNER's role
    if (targetMember.role === 'OWNER') {
      return Response.json(
        { error: "Cannot change another owner's role" },
        { status: 403 }
      )
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: targetMember.id },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    return Response.json({
      member: {
        userId: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        avatarUrl: updated.user.avatarUrl,
        role: updated.role,
        joinedAt: updated.joinedAt,
      },
    })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('PATCH /api/workspaces/[workspaceId]/members/[userId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/workspaces/[workspaceId]/members/[userId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> }
) {
  const { workspaceId, userId: targetUserId } = await params

  try {
    const { user: currentUser, membership: currentMembership } =
      await requireWorkspaceAccess(workspaceId, 'ADMIN')

    // Cannot remove yourself
    if (currentUser.id === targetUserId) {
      return Response.json(
        { error: 'Cannot remove yourself from the workspace' },
        { status: 400 }
      )
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
    })

    if (!targetMember) {
      return Response.json({ error: 'Member not found' }, { status: 404 })
    }

    // ADMIN can only remove USERs
    if (currentMembership.role === 'ADMIN' && targetMember.role !== 'USER') {
      return Response.json(
        { error: 'Admins can only remove users, not other admins or owners' },
        { status: 403 }
      )
    }

    // Cannot remove an OWNER (even another OWNER can't via this endpoint)
    if (targetMember.role === 'OWNER') {
      return Response.json(
        { error: 'Cannot remove an owner from the workspace' },
        { status: 403 }
      )
    }

    await prisma.workspaceMember.delete({
      where: { id: targetMember.id },
    })

    return Response.json({ success: true })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('DELETE /api/workspaces/[workspaceId]/members/[userId] error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
