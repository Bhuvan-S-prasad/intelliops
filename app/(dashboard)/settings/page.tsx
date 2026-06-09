'use client'

import * as React from 'react'
import { useUser } from '@clerk/nextjs'
import { useWorkspace, ActiveWorkspaceDetails, Member } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Settings,
  Users,
  UserPlus,
  MoreVertical,
  Shield,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
} from 'lucide-react'

// Main settings page routing component
export default function SettingsPage() {
  const { user } = useUser()
  const {
    activeWorkspace,
    currentUserRole,
    members,
    refreshActiveWorkspace,
  } = useWorkspace()

  if (!activeWorkspace) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-400" />
          Workspace Settings
        </h1>
        <p className="text-xs text-zinc-400">
          Manage your workspace preferences, profile, and team permissions.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg w-fit h-fit flex gap-1">
          <TabsTrigger value="general" className="px-4 py-1.5 rounded-md text-xs font-semibold">
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="px-4 py-1.5 rounded-md text-xs font-semibold">
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings
            key={activeWorkspace.id}
            activeWorkspace={activeWorkspace}
            currentUserRole={currentUserRole}
            refreshActiveWorkspace={refreshActiveWorkspace}
          />
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <MembersSettings
            key={activeWorkspace.id}
            activeWorkspace={activeWorkspace}
            currentUserRole={currentUserRole}
            members={members}
            refreshActiveWorkspace={refreshActiveWorkspace}
            currentUserEmail={user?.primaryEmailAddress?.emailAddress || ''}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Subcomponent: General Settings tab view
interface GeneralSettingsProps {
  activeWorkspace: ActiveWorkspaceDetails
  currentUserRole: 'OWNER' | 'ADMIN' | 'USER' | null
  refreshActiveWorkspace: () => Promise<void>
}

function GeneralSettings({
  activeWorkspace,
  currentUserRole,
  refreshActiveWorkspace,
}: GeneralSettingsProps) {
  const [workspaceName, setWorkspaceName] = React.useState(activeWorkspace.name)
  const [workspaceDescription, setWorkspaceDescription] = React.useState(activeWorkspace.description || '')
  const [isSavingGeneral, setIsSavingGeneral] = React.useState(false)

  const [confirmDeleteName, setConfirmDeleteName] = React.useState('')
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspaceName.trim()) {
      toast.error('Workspace name is required')
      return
    }

    setIsSavingGeneral(true)
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName.trim(),
          description: workspaceDescription.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update workspace')
      }

      toast.success('Workspace settings updated')
      await refreshActiveWorkspace()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setIsSavingGeneral(false)
    }
  }

  const handleDeleteWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmDeleteName !== activeWorkspace.name) {
      toast.error('Workspace name does not match')
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete workspace')
      }

      toast.success('Workspace deleted successfully')
      document.cookie = 'activeWorkspaceId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'
      window.location.href = '/dashboard'
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
      setIsDeleting(false)
    }
  }

  const isOwner = currentUserRole === 'OWNER'
  const isAdminOrOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md">
        <form onSubmit={handleSaveGeneral}>
          <CardHeader className="p-6">
            <CardTitle className="text-base font-semibold">Workspace Profile</CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Update the name and descriptions that represent your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6 pt-0">
            <div className="space-y-2">
              <Label htmlFor="ws-name" className="text-xs font-semibold text-zinc-300">
                Workspace Name
              </Label>
              <Input
                id="ws-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={isSavingGeneral || !isAdminOrOwner}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-desc" className="text-xs font-semibold text-zinc-300">
                Description
              </Label>
              <textarea
                id="ws-desc"
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                disabled={isSavingGeneral || !isAdminOrOwner}
                placeholder="Short description of this workspace"
                rows={3}
                className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-offset-background placeholder:text-zinc-500 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
          {isAdminOrOwner && (
            <CardFooter className="bg-zinc-900/50 border-t border-zinc-850 px-6 py-4 flex justify-end">
              <Button
                type="submit"
                disabled={isSavingGeneral}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4"
              >
                {isSavingGeneral ? 'Saving...' : 'Save changes'}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {isOwner && (
        <Card className="bg-zinc-900 border-red-950 text-zinc-100 shadow-md">
          <CardHeader className="p-6">
            <CardTitle className="text-base font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 mt-1">
              Deleting this workspace is permanent. It will permanently remove all files, databases, conversations, and audit logs. There is no undo.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0 space-y-4">
            <form onSubmit={handleDeleteWorkspace} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="confirm-ws-delete" className="text-xs font-medium text-zinc-300">
                  To confirm, type <span className="font-semibold text-zinc-100">{activeWorkspace.name}</span> below:
                </Label>
                <Input
                  id="confirm-ws-delete"
                  type="text"
                  placeholder="Type the workspace name"
                  value={confirmDeleteName}
                  onChange={(e) => setConfirmDeleteName(e.target.value)}
                  disabled={isDeleting}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm max-w-md"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={confirmDeleteName !== activeWorkspace.name || isDeleting}
                variant="destructive"
                className="text-xs px-4 font-semibold shadow-lg shadow-red-900/10"
              >
                {isDeleting ? 'Deleting...' : 'Delete Workspace'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}

// Subcomponent: Members Settings tab view
interface MembersSettingsProps {
  activeWorkspace: ActiveWorkspaceDetails
  currentUserRole: 'OWNER' | 'ADMIN' | 'USER' | null
  members: Member[]
  refreshActiveWorkspace: () => Promise<void>
  currentUserEmail: string
}

function MembersSettings({
  activeWorkspace,
  currentUserRole,
  members,
  refreshActiveWorkspace,
  currentUserEmail,
}: MembersSettingsProps) {
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<'ADMIN' | 'USER'>('USER')
  const [isInviting, setIsInviting] = React.useState(false)

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Email is required')
      return
    }

    setIsInviting(true)
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite member')
      }

      toast.success(`Invited ${inviteEmail}`)
      setInviteEmail('')
      await refreshActiveWorkspace()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateRole = async (targetUserId: string, newRole: 'ADMIN' | 'USER') => {
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members/${targetUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update member role')
      }

      toast.success('Member role updated')
      await refreshActiveWorkspace()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    }
  }

  const handleRemoveMember = async (targetUserId: string, memberEmail: string) => {
    const isSelf = currentUserEmail === memberEmail
    const confirmMessage = isSelf 
      ? 'Are you sure you want to leave this workspace?'
      : `Are you sure you want to remove ${memberEmail} from this workspace?`

    if (!confirm(confirmMessage)) return

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/members/${targetUserId}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove member')
      }

      toast.success(isSelf ? 'You left the workspace' : 'Member removed')
      
      if (isSelf) {
        window.location.href = '/dashboard'
      } else {
        await refreshActiveWorkspace()
      }
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    }
  }

  const isOwner = currentUserRole === 'OWNER'
  const isAdminOrOwner = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  const getMemberInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(' ')
      return parts.map((p) => p[0]).join('').toUpperCase().substring(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <>
      {/* Invite Form */}
      {isAdminOrOwner && (
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md">
          <form onSubmit={handleInviteMember}>
            <CardHeader className="p-6">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                Invite Member
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Invite a user to join this workspace. They must have a registered OpsIQ account.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0 flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label htmlFor="invite-email" className="text-xs font-semibold text-zinc-300">
                  Email Address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                  required
                />
              </div>
              <div className="space-y-2 w-full md:w-32">
                <Label htmlFor="invite-role" className="text-xs font-semibold text-zinc-300">
                  Role
                </Label>
                <Select
                  value={inviteRole}
                  onValueChange={(val) => setInviteRole(val as 'ADMIN' | 'USER')}
                >
                  <SelectTrigger id="invite-role" className="w-full bg-zinc-950 border-zinc-800 text-zinc-100 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={isInviting}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-4"
              >
                {isInviting ? 'Sending...' : 'Invite Member'}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {/* Members Table */}
      <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-md">
        <CardHeader className="p-6">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            Team Members
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            A list of all users who have access to this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 border-t border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/30 text-xs text-zinc-400 font-semibold">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                  {isAdminOrOwner && <th className="px-6 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isSelf = currentUserEmail === member.email
                  const memberJoinedDate = new Date(member.joinedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })

                  let roleBadgeClass = ''
                  let RoleIcon = UserCheck
                  if (member.role === 'OWNER') {
                    roleBadgeClass = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    RoleIcon = ShieldCheck
                  } else if (member.role === 'ADMIN') {
                    roleBadgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    RoleIcon = Shield
                  } else {
                    roleBadgeClass = 'bg-zinc-500/10 text-zinc-400 border border-zinc-850'
                  }

                  const canEditRole = isOwner && !isSelf && member.role !== 'OWNER'
                  const canRemove =
                    !isSelf &&
                    member.role !== 'OWNER' &&
                    (isOwner || (isAdminOrOwner && member.role === 'USER'))

                  return (
                    <tr key={member.userId} className="border-b border-zinc-800 hover:bg-zinc-950/20 transition-colors text-sm text-zinc-300">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-zinc-800">
                          <AvatarImage src={member.avatarUrl || ''} />
                          <AvatarFallback className="bg-zinc-800 text-zinc-200 text-xs font-semibold">
                            {getMemberInitials(member.name, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-zinc-200 flex items-center gap-1.5">
                            {member.name || 'Anonymous User'}
                            {isSelf && (
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-normal">
                                You
                              </span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${roleBadgeClass}`}>
                          <RoleIcon className="h-3 w-3" />
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 text-xs">{memberJoinedDate}</td>
                      
                      {isAdminOrOwner && (
                        <td className="px-6 py-4 text-right">
                          {(canEditRole || canRemove || isSelf) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850" />}>
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-100 w-44">
                                {canEditRole && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateRole(member.userId, member.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                                      className="text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer text-xs"
                                    >
                                      Promote to {member.role === 'ADMIN' ? 'User' : 'Admin'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-zinc-800" />
                                  </>
                                )}
                                {canRemove && (
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveMember(member.userId, member.email)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs"
                                  >
                                    Remove Member
                                  </DropdownMenuItem>
                                )}
                                {isSelf && member.role !== 'OWNER' && (
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveMember(member.userId, member.email)}
                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs font-semibold"
                                  >
                                    Leave Workspace
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
