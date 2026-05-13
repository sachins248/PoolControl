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
  User,
  GraduationCap,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent?: boolean
  roles: UserRole[]
}

const ALL_NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, roles: ['supervisor', 'manager', 'director', 'corporate'] },

  // Supervisor + Director
  { href: '/schedule', label: 'Daily Schedule', icon: CalendarDays, roles: ['supervisor', 'manager', 'director'] },
  { href: '/roster', label: 'Roster', icon: Users, roles: ['supervisor', 'manager', 'director'] },
  { href: '/audits/new', label: 'New Audit', icon: Plus, accent: true, roles: ['supervisor', 'manager', 'director'] },
  { href: '/remediation', label: 'Remediation', icon: AlertTriangle, roles: ['supervisor', 'manager', 'director'] },
  { href: '/team', label: 'Team Analysis', icon: BarChart3, roles: ['supervisor', 'manager', 'director'] },
  { href: '/training', label: 'Training Plans', icon: GraduationCap, roles: ['supervisor', 'manager', 'director'] },

  // Lifeguard self-service
  { href: '/my-profile', label: 'My Profile', icon: User, roles: ['lifeguard'] },
]

interface SidebarProps {
  facilityName?: string
  userRole: UserRole
  userName?: string
  plan?: string
  trialDaysLeft?: number | null
}

export function Sidebar({ facilityName = 'Aquatics Command Center', userRole, userName, plan = 'trial', trialDaysLeft }: SidebarProps) {
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

  const visibleItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole))

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
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => {
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
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-3 py-3 space-y-0.5">
        {(userRole === 'manager' || userRole === 'director') && (
          <>
            <Link
              href="/billing"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === '/billing'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/90'
              )}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="flex-1">Billing</span>
              {plan === 'trial' && trialDaysLeft != null && (
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  (trialDaysLeft as number) <= 3
                    ? 'bg-red-500/20 text-red-400'
                    : (trialDaysLeft as number) <= 7
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-white/10 text-white/50'
                )}>
                  {trialDaysLeft}d left
                </span>
              )}
              {plan !== 'trial' && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  Active
                </span>
              )}
            </Link>
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
          </>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
        <div className="px-3 pt-2">
          {userName && <p className="text-xs text-white/70 font-medium truncate">{userName}</p>}
          <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">TODAY</p>
          <p className="text-xs text-white/50 mt-0.5">{today}</p>
        </div>
      </div>
    </aside>
  )
}
