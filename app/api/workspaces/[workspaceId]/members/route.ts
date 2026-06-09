import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceAccess } from '@/lib/auth'

const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'USER']),
})

// GET /api/workspaces/[workspaceId]/members
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    await requireWorkspaceAccess(workspaceId, 'USER')

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return Response.json({
      members: members.map((m) => ({
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
    console.error('GET /api/workspaces/[workspaceId]/members error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/workspaces/[workspaceId]/members
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params

  try {
    const { user: inviter } = await requireWorkspaceAccess(workspaceId, 'ADMIN')

    const body = await req.json()
    const parsed = InviteMemberSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data

    // Look up user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (!targetUser) {
      return Response.json(
        { error: 'User not registered — they must sign up first.' },
        { status: 404 }
      )
    }

    // Check if already a member
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUser.id },
      },
    })

    if (existingMembership) {
      return Response.json(
        { error: 'User is already a member of this workspace' },
        { status: 409 }
      )
    }

    // Create membership + audit log in a transaction
    const membership = await prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.create({
        data: {
          workspaceId,
          userId: targetUser.id,
          role,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      })

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: inviter.id,
          action: 'member.invite',
          metadata: {
            invitedUserId: targetUser.id,
            invitedEmail: email,
            role,
          },
        },
      })

      return member
    })

    return Response.json(
      {
        member: {
          userId: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          avatarUrl: membership.user.avatarUrl,
          role: membership.role,
          joinedAt: membership.joinedAt,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces/[workspaceId]/members error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
