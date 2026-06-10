import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/10 max-w-md mx-auto my-6 space-y-4 animate-in fade-in-0 duration-300">
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800/80 text-zinc-600 shadow-inner">
        <Icon className="h-6 w-6 stroke-[1.5]" />
      </div>

      {/* Title & Description */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-zinc-400 tracking-tight">{title}</h3>
        <p className="text-xs text-zinc-650 max-w-xs leading-relaxed font-sans">{description}</p>
      </div>

      {/* Action Button */}
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-500/10 cursor-pointer shrink-0 mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
