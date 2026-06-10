'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { useWorkspace } from '@/components/workspace-provider'
import { cn } from '@/lib/utils'
import { CommandPalette } from '@/components/command-palette'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronsUpDown,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  User,
} from 'lucide-react'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const {
    workspaces,
    activeWorkspace,
    currentUserRole,
    isLoading,
    switchWorkspace,
    members,
  } = useWorkspace()

  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  const [stats, setStats] = React.useState<{ totalFiles: number; processingFiles: number } | null>(null)

  React.useEffect(() => {
    if (!activeWorkspace) return
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/workspaces/${activeWorkspace.id}/stats`)
        if (res.ok) {
          const data = await res.json()
          setStats({
            totalFiles: data.totalFiles,
            processingFiles: data.processingFiles,
          })
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 15000)
    return () => clearInterval(interval)
  }, [activeWorkspace])

  // Navigation shortcuts list
  const navItems = [
    { name: 'Dashboard', href: activeWorkspace ? `/${activeWorkspace.slug}` : '/dashboard', icon: LayoutDashboard, shortcut: 'G then D' },
    { name: 'Search', href: activeWorkspace ? `/${activeWorkspace.slug}/search` : '/search', icon: Search, shortcut: 'G then S' },
    { name: 'Files', href: activeWorkspace ? `/${activeWorkspace.slug}/files` : '/files', icon: FolderOpen, shortcut: 'G then F' },
    { name: 'Conversations', href: activeWorkspace ? `/${activeWorkspace.slug}/chat` : '/conversations', icon: MessageSquare, shortcut: 'G then C' },
    { name: 'Settings', href: '/settings', icon: Settings, shortcut: 'G then T' },
  ]

  // Keyboard shortcut listener
  React.useEffect(() => {
    let lastKey = ''
    let timer: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      const key = e.key.toLowerCase()

      if (key === 'g') {
        lastKey = 'g'
        clearTimeout(timer)
        timer = setTimeout(() => { lastKey = '' }, 1000)
        return
      }

      if (lastKey === 'g') {
        if (key === 'd') {
          router.push(activeWorkspace ? `/${activeWorkspace.slug}` : '/dashboard')
        } else if (key === 's') {
          router.push(activeWorkspace ? `/${activeWorkspace.slug}/search` : '/search')
        } else if (key === 'f') {
          router.push(activeWorkspace ? `/${activeWorkspace.slug}/files` : '/files')
        } else if (key === 'c') {
          router.push(activeWorkspace ? `/${activeWorkspace.slug}/chat` : '/conversations')
        } else if (key === 't') {
          router.push('/settings')
        }
        lastKey = ''
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timer)
    }
  }, [activeWorkspace, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading workspace context...</p>
        </div>
      </div>
    )
  }

  // Fallback for user initials
  const getUserInitials = () => {
    if (!user) return 'U'
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    }
    return user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || 'U'
  }

  const handleCreateWorkspace = () => {
    setIsMobileOpen(false)
    router.push('/onboarding?new=1')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-zinc-900 border-r border-zinc-800 py-4 text-zinc-100">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Brand / Logo */}
        <div className={cn("flex items-center px-4", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
              O
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-lg tracking-tight bg-linear-to-r from-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                IntelliOps
              </span>
            )}
          </div>
          
          {/* Collapse toggle (Desktop only) */}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsCollapsed(true)}
              className="hidden md:flex text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Workspace Switcher */}
        <div className="px-2">
          {isCollapsed ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-9 w-9 mx-auto items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-indigo-500 hover:bg-zinc-800 font-bold uppercase transition-all focus:outline-none cursor-pointer">
                {activeWorkspace?.name?.[0] || 'W'}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-zinc-400">Switch Workspace</DropdownMenuLabel>
                  {workspaces.map((w) => (
                    <DropdownMenuItem
                      key={w.id}
                      onClick={() => switchWorkspace(w.id)}
                      className={cn(
                        "flex items-center justify-between text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer",
                        w.id === activeWorkspace?.id && "bg-zinc-800/50 text-white font-medium"
                      )}
                    >
                      <span className="truncate">{w.name}</span>
                      {w.id === activeWorkspace?.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2 text-indigo-400 focus:bg-zinc-800 focus:text-indigo-300 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-left hover:bg-zinc-950 hover:border-zinc-700/80 transition-all group focus:outline-none cursor-pointer">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-xs font-bold text-zinc-300 group-hover:bg-zinc-700 transition-colors uppercase">
                    {activeWorkspace?.name?.[0] || 'W'}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {activeWorkspace?.name}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {stats ? `${stats.totalFiles} files` : '0 files'} · {members.length} members
                    </p>
                  </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-zinc-400">Switch Workspace</DropdownMenuLabel>
                  {workspaces.map((w) => (
                    <DropdownMenuItem
                      key={w.id}
                      onClick={() => switchWorkspace(w.id)}
                      className={cn(
                        "flex items-center justify-between text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer",
                        w.id === activeWorkspace?.id && "bg-zinc-800/50 text-white font-medium"
                      )}
                    >
                      <span className="truncate">{w.name}</span>
                      {w.id === activeWorkspace?.id && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleCreateWorkspace}
                  className="flex items-center gap-2 text-indigo-400 focus:bg-zinc-800 focus:text-indigo-300 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            const isFilesItem = item.name === 'Files'

            if (isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger render={
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 transition-all mx-auto relative",
                        isActive && "bg-zinc-800 text-indigo-400 border border-zinc-700/50"
                      )}
                    />
                  }>
                    <div className="relative">
                      <Icon className="h-4 w-4" />
                      {isFilesItem && stats && stats.processingFiles > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-zinc-950 border-zinc-800 text-zinc-100 flex items-center gap-1.5">
                    <span>{item.name}</span>
                    <span className="text-[9px] font-mono text-zinc-650 bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800">
                      {item.shortcut}
                    </span>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-md py-2 px-3 text-sm font-medium transition-all group relative border-l-2 border-transparent",
                  isActive
                    ? "bg-zinc-800/40 text-zinc-100 border-l-indigo-500 rounded-l-none pl-2.5"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-400" : "text-zinc-400")} />
                    {isFilesItem && stats && stats.processingFiles > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </div>
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-650 bg-zinc-950/80 px-1 py-0.2 rounded border border-zinc-850 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                  {item.shortcut}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="space-y-4 px-2">
        {/* Expand button if collapsed */}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsCollapsed(false)}
            className="hidden md:flex h-9 w-9 mx-auto items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {/* User Card / Avatar */}
        <div className="border-t border-zinc-800/80 pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-all hover:bg-zinc-800/60 focus:outline-none cursor-pointer",
                isCollapsed ? "justify-center" : "justify-between"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-7 w-7 border border-zinc-800">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'User'} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-200 text-xs font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="min-w-0 text-left">
                    <p className="truncate text-xs font-semibold text-zinc-200 leading-tight">
                      {user?.fullName || 'User Account'}
                    </p>
                    <p className="truncate text-[10px] text-zinc-500 leading-none">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side={isCollapsed ? "right" : "top"} className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-zinc-200">{user?.fullName}</p>
                  <p className="text-xs leading-none text-zinc-500">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                onClick={() => router.push('/settings')}
                className="flex items-center gap-2 text-zinc-300 focus:bg-zinc-800 focus:text-white cursor-pointer"
              >
                <User className="h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <SignOutButton>
                <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-zinc-950 font-sans">
      {/* Desktop Sidebar (Persistent) */}
      <aside
        className={cn(
          "hidden md:block shrink-0 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-16" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Header + Menu */}
      <div className="flex w-full flex-col min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 md:hidden backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
              O
            </div>
            <span className="font-semibold text-zinc-100">IntelliOps</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-0.5 font-medium text-zinc-400 max-w-[120px] truncate uppercase">
              {activeWorkspace?.name}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            >
              {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 top-14 z-40 bg-zinc-950/80 backdrop-blur-sm md:hidden animate-in fade-in-0 duration-200">
            <div className="h-[calc(100vh-3.5rem)] w-64 border-r border-zinc-800 animate-in slide-in-from-left duration-200">
              {sidebarContent}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 text-zinc-100 bg-zinc-950">
          {children}
        </main>
      </div>
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  )
}
