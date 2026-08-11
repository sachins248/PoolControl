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
  { href: '/schedule', label: 'Daily Schedule', icon: CalendarDays, roles: ['supervisor', 'manager', 'director'] },
  { href: '/roster', label: 'Roster', icon: Users, roles: ['supervisor', 'manager', 'director'] },
  { href: '/audits/new', label: 'New Audit', icon: Plus, accent: true, roles: ['supervisor', 'manager', 'director'] },
  { href: '/remediation', label: 'Remediation', icon: AlertTriangle, roles: ['supervisor', 'manager', 'director'] },
  { href: '/team', label: 'Team Analysis', icon: BarChart3, roles: ['supervisor', 'manager', 'director'] },
  { href: '/training', label: 'Training Plans', icon: GraduationCap, roles: ['supervisor', 'manager', 'director'] },
  { href: '/my-profile', label: 'My Profile', icon: User, roles: ['lifeguard'] },
]

interface SidebarProps {
  facilityName?: string
  userRole: UserRole
  userName?: string
  plan?: string
  trialDaysLeft?: number | null
}

/* Shared link treatment — hairline left rule that lights up when active */
const linkBase =
  'flex items-center gap-3 px-3 py-2.5 border-l-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-150'

export function Sidebar({
  facilityName = 'Aquatics Command Center',
  userRole,
  userName,
  plan = 'trial',
  trialDaysLeft,
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/auth/login')
  }

  const visibleItems = ALL_NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-[#061523] text-[#efece3] shrink-0 border-r border-[rgba(239,236,227,0.14)]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5 border-b border-[rgba(239,236,227,0.14)]">
        <img
          src="/logo.jpeg"
          alt="PoolControl.ai"
          className="w-8 h-8 object-cover shrink-0 border border-[rgba(239,236,227,0.4)]"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight [font-family:var(--disp)] tracking-[0.04em]">
            POOLCONTROL<span className="text-[#ff4a1a]">.AI</span>
          </p>
          <p className="text-[9px] text-[rgba(239,236,227,0.4)] truncate leading-tight mt-1 uppercase tracking-[0.14em]">
            {facilityName}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-0 py-4 overflow-y-auto">
        <ul>
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    linkBase,
                    active
                      ? item.accent
                        ? 'border-[#ff4a1a] text-[#ff4a1a] bg-[rgba(255,74,26,0.06)]'
                        : 'border-[#45e0ce] text-[#45e0ce] bg-[rgba(69,224,206,0.05)]'
                      : item.accent
                        ? 'border-transparent text-[#ff6b45] hover:border-[rgba(255,74,26,0.5)] hover:bg-[rgba(255,74,26,0.05)]'
                        : 'border-transparent text-[rgba(239,236,227,0.5)] hover:border-[rgba(239,236,227,0.3)] hover:text-[rgba(239,236,227,0.85)] hover:bg-[rgba(239,236,227,0.03)]'
                  )}
                >
                  <Icon className="w-[14px] h-[14px] shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-[rgba(239,236,227,0.14)] py-3">
        {(userRole === 'manager' || userRole === 'director') && (
          <>
            <Link
              href="/billing"
              className={cn(
                linkBase,
                pathname === '/billing'
                  ? 'border-[#45e0ce] text-[#45e0ce] bg-[rgba(69,224,206,0.05)]'
                  : 'border-transparent text-[rgba(239,236,227,0.5)] hover:border-[rgba(239,236,227,0.3)] hover:text-[rgba(239,236,227,0.85)]'
              )}
            >
              <CreditCard className="w-[14px] h-[14px] shrink-0" />
              <span className="flex-1">Billing</span>
              {plan === 'trial' && trialDaysLeft != null && (
                <span
                  className={cn(
                    'text-[8px] font-semibold px-1.5 py-0.5 border tracking-[0.1em]',
                    (trialDaysLeft as number) <= 3
                      ? 'border-[rgba(255,74,26,0.5)] text-[#ff6b45]'
                      : (trialDaysLeft as number) <= 7
                      ? 'border-[rgba(255,176,32,0.5)] text-[#ffb020]'
                      : 'border-[rgba(239,236,227,0.2)] text-[rgba(239,236,227,0.4)]'
                  )}
                >
                  {trialDaysLeft}D
                </span>
              )}
              {plan !== 'trial' && (
                <span className="text-[8px] font-semibold px-1.5 py-0.5 border border-[rgba(69,224,206,0.5)] text-[#45e0ce] tracking-[0.1em]">
                  ACTIVE
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className={cn(
                linkBase,
                pathname === '/settings'
                  ? 'border-[#45e0ce] text-[#45e0ce] bg-[rgba(69,224,206,0.05)]'
                  : 'border-transparent text-[rgba(239,236,227,0.5)] hover:border-[rgba(239,236,227,0.3)] hover:text-[rgba(239,236,227,0.85)]'
              )}
            >
              <Settings className="w-[14px] h-[14px]" />
              Settings
            </Link>
          </>
        )}

        <button
          onClick={handleSignOut}
          className={cn(
            linkBase,
            'w-full border-transparent text-[rgba(239,236,227,0.35)] hover:border-[rgba(255,74,26,0.5)] hover:text-[#ff6b45]'
          )}
        >
          <LogOut className="w-[14px] h-[14px]" />
          Sign out
        </button>

        {/* User info */}
        <div className="px-5 pt-3 mt-2 border-t border-[rgba(239,236,227,0.08)]">
          {userName && (
            <p className="text-[11px] text-[rgba(239,236,227,0.75)] font-semibold truncate leading-snug tracking-[0.04em]">
              {userName}
            </p>
          )}
          <p className="text-[8px] text-[rgba(239,236,227,0.3)] uppercase tracking-[0.26em] mt-1">
            {today}
          </p>
        </div>
      </div>
    </aside>
  )
}
