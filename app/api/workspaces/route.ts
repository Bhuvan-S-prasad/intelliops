import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

// GET /api/workspaces
// Get all workspaces for the authenticated user
export async function GET() {
  try {
    const { user } = await requireAuth()

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        workspace: {
          name: 'asc',
        },
      },
    })

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      createdAt: m.workspace.createdAt,
      role: m.role,
    }))

    return Response.json({ workspaces })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('GET /api/workspaces error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/workspaces
// Create a new workspace and add the creator as OWNER
export async function POST(req: Request) {
  try {
    const { user } = await requireAuth()

    const body = await req.json()
    const parsed = CreateWorkspaceSchema.safeParse(body)

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, description } = parsed.data
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    
    // Simple short unique slug generator
    const randomSuffix = Math.random().toString(36).substring(2, 7)
    const slug = `${baseSlug || 'workspace'}-${randomSuffix}`

    // Create workspace and add owner member in a transaction
    const newWorkspace = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          description,
        },
      })

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
        },
      })

      // Create an audit log for workspace creation
      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          action: 'workspace.create',
          metadata: { name, slug },
        },
      })

      return workspace
    })

    return Response.json({ workspace: newWorkspace }, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('POST /api/workspaces error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
