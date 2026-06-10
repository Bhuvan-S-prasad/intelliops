'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useWorkspace } from '@/components/workspace-provider'
import { Loader2 } from 'lucide-react'

export default function DashboardRedirectPage() {
  const { activeWorkspace, isLoading } = useWorkspace()
  const router = useRouter()

  React.useEffect(() => {
    if (isLoading) return

    if (activeWorkspace) {
      router.replace(`/${activeWorkspace.slug}`)
    } else {
      router.replace('/onboarding')
    }
  }, [activeWorkspace, isLoading, router])

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        <p className="text-xs text-zinc-450">Redirecting to workspace...</p>
      </div>
    </div>
  )
}
