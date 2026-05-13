import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TrainingClient } from './training-client'
import type { TrainingSession } from '@/types'

export default async function TrainingPage() {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('facility_id', profile.facility_id)
    .order('created_at', { ascending: false })

  return (
    <TrainingClient
      initialSessions={(sessions ?? []) as TrainingSession[]}
      userRole={profile.role}
    />
  )
}
