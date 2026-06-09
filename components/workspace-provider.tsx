'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { toast } from 'sonner'

export type Workspace = {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  role: 'OWNER' | 'ADMIN' | 'USER'
}

export type Member = {
  userId: string
  name: string | null
  email: string
  avatarUrl: string | null
  role: 'OWNER' | 'ADMIN' | 'USER'
  joinedAt: string
}

export type ActiveWorkspaceDetails = {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
}

type WorkspaceContextType = {
  workspaces: Workspace[]
  activeWorkspace: ActiveWorkspaceDetails | null
  currentUserRole: 'OWNER' | 'ADMIN' | 'USER' | null
  members: Member[]
  isLoading: boolean
  switchWorkspace: (workspaceId: string) => Promise<void>
  refreshActiveWorkspace: () => Promise<void>
}

const WorkspaceContext = React.createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([])
  const [activeWorkspace, setActiveWorkspace] = React.useState<ActiveWorkspaceDetails | null>(null)
  const [currentUserRole, setCurrentUserRole] = React.useState<'OWNER' | 'ADMIN' | 'USER' | null>(null)
  const [members, setMembers] = React.useState<Member[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch workspaces list
  const fetchWorkspaces = React.useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces')
      if (!res.ok) throw new Error('Failed to fetch workspaces')
      const data = await res.json()
      return data.workspaces as Workspace[]
    } catch (err) {
      console.error(err)
      toast.error('Could not load workspaces')
      return []
    }
  }, [])

  // Fetch details of active workspace
  const fetchActiveWorkspaceDetails = React.useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`)
      if (!res.ok) {
        // If workspace not found or no access, clear cookie and trigger reload
        document.cookie = 'activeWorkspaceId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
        return null
      }
      const data = await res.json()
      return {
        workspace: data.workspace as ActiveWorkspaceDetails,
        currentUserRole: data.currentUserRole as 'OWNER' | 'ADMIN' | 'USER',
        members: data.members as Member[],
      }
    } catch (err) {
      console.error(err)
      return null
    }
  }, [])

  const loadData = React.useCallback(async () => {
    if (!isUserLoaded || !user) return

    setIsLoading(true)
    const list = await fetchWorkspaces()
    setWorkspaces(list)

    if (list.length === 0) {
      setIsLoading(false)
      if (pathname !== '/onboarding') {
        router.push('/onboarding')
      }
      return
    }

    // Get active workspace ID from cookie
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('activeWorkspaceId='))
      ?.split('=')[1]

    let selectedId = cookieValue

    // If no cookie or cookie workspace does not exist in user's list, default to first workspace
    if (!selectedId || !list.some((w) => w.id === selectedId)) {
      selectedId = list[0].id
      document.cookie = `activeWorkspaceId=${selectedId}; path=/; max-age=31536000; SameSite=Lax`
    }

    const details = await fetchActiveWorkspaceDetails(selectedId)
    if (details) {
      setActiveWorkspace(details.workspace)
      setCurrentUserRole(details.currentUserRole)
      setMembers(details.members)
    } else {
      // Retry with the first workspace in list if the cookie one failed
      const firstId = list[0].id
      document.cookie = `activeWorkspaceId=${firstId}; path=/; max-age=31536000; SameSite=Lax`
      const retryDetails = await fetchActiveWorkspaceDetails(firstId)
      if (retryDetails) {
        setActiveWorkspace(retryDetails.workspace)
        setCurrentUserRole(retryDetails.currentUserRole)
        setMembers(retryDetails.members)
      }
    }

    setIsLoading(false)
  }, [isUserLoaded, user, fetchWorkspaces, fetchActiveWorkspaceDetails, pathname, router])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const switchWorkspace = async (workspaceId: string) => {
    setIsLoading(true)
    document.cookie = `activeWorkspaceId=${workspaceId}; path=/; max-age=31536000; SameSite=Lax`
    
    const details = await fetchActiveWorkspaceDetails(workspaceId)
    if (details) {
      setActiveWorkspace(details.workspace)
      setCurrentUserRole(details.currentUserRole)
      setMembers(details.members)
      toast.success(`Switched to workspace: ${details.workspace.name}`)
      
      // Forces Next.js router to refresh and update path data if needed
      router.refresh()
    } else {
      toast.error('Failed to switch workspace')
    }
    setIsLoading(false)
  }

  const refreshActiveWorkspace = async () => {
    if (!activeWorkspace) return
    const details = await fetchActiveWorkspaceDetails(activeWorkspace.id)
    if (details) {
      setActiveWorkspace(details.workspace)
      setCurrentUserRole(details.currentUserRole)
      setMembers(details.members)
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        currentUserRole,
        members,
        isLoading,
        switchWorkspace,
        refreshActiveWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext)
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
