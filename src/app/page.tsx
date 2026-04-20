import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const profile = await getServerUser()

  if (!profile) {
    redirect('/auth/login')
  }

  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (profile.role === 'corporate') redirect('/dashboard')
  redirect('/schedule')
}
