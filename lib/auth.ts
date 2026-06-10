import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import type { WorkspaceRole } from '@prisma/client'

/**
 * Resolved auth context for a user within a workspace.
 * All API route handlers that need workspace-level access should use `requireWorkspaceAccess`.
 */
export type WorkspaceAuthContext = {
  clerkUserId: string
  user: { id: string; email: string; name: string | null; avatarUrl: string | null }
  membership: { id: string; role: WorkspaceRole }
}

/**
 * Role hierarchy for RBAC checks.
 * Higher number = more privileges.
 */
const ROLE_LEVEL: Record<WorkspaceRole, number> = {
  USER: 1,
  ADMIN: 2,
  OWNER: 3,
}

/**
 * Authenticate the current Clerk user and resolve their DB record.
 * If the user is authenticated via Clerk but doesn't exist in the DB yet
 * (e.g. webhook hasn't fired — common in local dev), create them on-the-fly.
 * Throws a Response if not authenticated.
 */
export async function requireAuth() {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    throw Response.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true, email: true, name: true, avatarUrl: true },
  })

  // Just-in-time sync: create DB user from Clerk profile if webhook hasn't delivered yet
  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      throw Response.json({ error: 'Unable to resolve user profile' }, { status: 401 })
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress
      ?? clerkUser.emailAddresses[0]?.emailAddress
      ?? ''
    const nameParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean)
    const name = nameParts.length > 0 ? nameParts.join(' ') : null

    user = await prisma.user.upsert({
      where: { clerkId: clerkUserId },
      update: {}, // no-op if another request just created it (race condition guard)
      create: {
        clerkId: clerkUserId,
        email,
        name,
        avatarUrl: clerkUser.imageUrl ?? null,
      },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })

    console.log(`[JIT sync] User created in DB: ${clerkUserId} (${email})`)
  }

  return { clerkUserId, user }
}

/**
 * Authenticate the current user AND verify they have at least `minimumRole`
 * in the given workspace.
 *
 * Usage in a route handler:
 * ```ts
 * const { user, membership } = await requireWorkspaceAccess(workspaceId, 'ADMIN')
 * ```
 */
export async function requireWorkspaceAccess(
  workspaceId: string,
  minimumRole: WorkspaceRole = 'USER'
): Promise<WorkspaceAuthContext> {
  const { clerkUserId, user } = await requireAuth()

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: user.id },
    },
    select: { id: true, role: true },
  })

  if (!membership) {
    throw Response.json({ error: 'Not a member of this workspace' }, { status: 403 })
  }

  if (ROLE_LEVEL[membership.role] < ROLE_LEVEL[minimumRole]) {
    throw Response.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  return { clerkUserId, user, membership }
}
