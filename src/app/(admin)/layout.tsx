import { requireUser, isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSignOut from './admin-sign-out'
import '../app.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()
  if (!isSuperAdmin(profile.role)) redirect('/schedule')

  return (
    <div className="app-root min-h-screen bg-gray-50">
      <header className="bg-[#0f1e2e] border-b border-[rgba(239,236,227,0.14)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="PoolControl.ai" className="w-8 h-8 object-cover border border-[rgba(239,236,227,0.4)]" />
            <span className="text-white text-[11px] font-bold [font-family:var(--disp)] tracking-[0.04em]">
              POOLCONTROL<span className="text-[#ff4a1a]">.AI</span>
            </span>
            <span className="text-[8px] font-semibold px-2 py-1 border border-[rgba(255,74,26,0.5)] text-[#ff6b45] uppercase tracking-[0.2em]">
              Admin Panel
            </span>
          </div>
          <AdminSignOut />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
