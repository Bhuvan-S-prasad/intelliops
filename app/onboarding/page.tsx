'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, LayoutGrid } from 'lucide-react'

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  // Wait for Clerk user to load
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading user context...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not signed in
  if (isLoaded && !user) {
    router.push('/sign-in')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Workspace name is required')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create workspace')
      }

      toast.success(`Workspace "${data.workspace.name}" created!`)
      
      // Set the activeWorkspaceId cookie client-side too to be safe
      document.cookie = `activeWorkspaceId=${data.workspace.id}; path=/; max-age=31536000; SameSite=Lax`

      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="absolute top-4 right-4">
        <SignOutButton>
          <Button variant="ghost" size="sm" className="gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </SignOutButton>
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-lg">
              O
            </div>
            <span className="text-2xl font-semibold tracking-tight">OpsIQ</span>
          </div>
          <p className="text-sm text-zinc-400">
            Lets get started. Create your first workspace.
          </p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900 text-zinc-100 shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1.5 p-6">
              <CardTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-indigo-500" />
                Create Workspace
              </CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                Workspaces group your files, conversations, and settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-zinc-300">
                  Workspace Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Acme Corp, Personal, Research, etc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="bg-zinc-950 border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-zinc-100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold text-zinc-300">
                  Description <span className="text-zinc-500 font-normal">(Optional)</span>
                </Label>
                <textarea
                  id="description"
                  placeholder="What is this workspace for?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="flex w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none ring-offset-background placeholder:text-zinc-500 focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-6 border-t border-zinc-800/50">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg hover:shadow-indigo-500/10 transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </div>
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
