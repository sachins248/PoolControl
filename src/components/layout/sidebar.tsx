'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CalendarDays,
  Plus,
  AlertTriangle,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent?: boolean
}

interface NavSection {
  label: string | null
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'LIFEGUARDS',
    items: [
      { href: '/roster', label: 'Roster', icon: Users },
      { href: '/team', label: 'Team Analysis', icon: BarChart3 },
      { href: '/schedule', label: 'Daily Schedule', icon: CalendarDays },
    ],
  },
  {
    label: null,
    items: [
      { href: '/audits/new', label: 'New Audit', icon: Plus, accent: true },
      { href: '/remediation', label: 'Remediation', icon: AlertTriangle },
    ],
  },
]

interface SidebarProps {
  facilityName?: string
}

export function Sidebar({ facilityName = 'Aquatics Command Center' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#0f1e2e] text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500 text-white font-bold text-sm shrink-0">
          PC
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">PoolControl.ai</p>
          <p className="text-xs text-white/50 truncate leading-tight mt-0.5">{facilityName}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="px-2 mb-1.5 text-[10px] font-semibold tracking-widest text-white/30 uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white/90',
                        item.accent && !active && 'text-emerald-400 hover:text-emerald-300'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-white/10 text-white'
              : 'text-white/60 hover:bg-white/5 hover:text-white/90'
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <div className="px-3 pt-2">
          <p className="text-[10px] text-white/30 uppercase tracking-widest">TODAY</p>
          <p className="text-xs text-white/50 mt-0.5">{today}</p>
        </div>
      </div>
    </aside>
  )
}
