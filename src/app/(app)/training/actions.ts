'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUserForAction } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { LessonPlan } from '@/types'

export async function saveTrainingSession(data: {
  topic: string
  why_this_topic: string
  priority: 'High' | 'Medium' | 'Low'
  lesson_plan: LessonPlan
  scheduled_date: string
}) {
  const { profile } = await requireUserForAction()
  if (!profile.facility_id) throw new Error('No facility')

  const supabase = createClient()
  const { error } = await supabase.from('training_sessions').insert({
    facility_id: profile.facility_id,
    topic: data.topic,
    why_this_topic: data.why_this_topic,
    priority: data.priority,
    lesson_plan: data.lesson_plan,
    scheduled_date: data.scheduled_date,
    is_ai_generated: true,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/training')
}

export async function deleteTrainingSession(id: string) {
  const { profile } = await requireUserForAction()
  if (!profile.facility_id) throw new Error('No facility')

  const supabase = createClient()
  const { error } = await supabase
    .from('training_sessions')
    .delete()
    .eq('id', id)
    .eq('facility_id', profile.facility_id)

  if (error) throw new Error(error.message)
  revalidatePath('/training')
}
